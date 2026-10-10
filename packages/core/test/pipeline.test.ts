import { generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
	ConfigError,
	createLicenseVerifier,
	definePlugin,
	defineStage,
	PipelineEngine,
	PipelineError,
	resolveConfig,
	type ZaydemyConfig,
} from "../src";
import { MemoryStore } from "./memory-store";

const prepayment = defineStage({
	id: "prepayment",
	label: "stages.prepayment",
	options: z.object({ amount: z.number().default(0) }),
	onEnter: ({ options }) => (options.amount > 0 ? "wait" : "skip"),
});
const interview = defineStage({ id: "interview", label: "stages.interview" });
const documents = defineStage({ id: "documents", label: "stages.documents" });

const stagesPlugin = definePlugin({
	id: "test-stages",
	name: "Test stages",
	version: "0.0.0",
	stages: [prepayment, interview, documents],
});

function baseConfig(overrides: Partial<ZaydemyConfig> = {}): ZaydemyConfig {
	return {
		brand: { name: "Test", slug: "test" },
		locales: { default: "tr", supported: ["tr", "en"] },
		plugins: [stagesPlugin],
		pipelines: { default: ["prepayment", "interview", "documents"], free: [] },
		...overrides,
	};
}

describe("PipelineEngine", () => {
	let store: MemoryStore;
	let engine: PipelineEngine;
	let emitted: string[];

	beforeEach(() => {
		const config = resolveConfig(baseConfig());
		emitted = [];
		for (const e of [
			"stage.entered",
			"stage.completed",
			"stage.skipped",
			"application.enrolled",
			"application.rejected",
		]) {
			config.events.on(e, () => {
				emitted.push(e);
			});
		}
		store = new MemoryStore();
		engine = new PipelineEngine(config, store);
	});

	it("waits at the first stage that needs action", async () => {
		store.add({
			id: "a",
			pipeline: ["prepayment", "interview"],
			stageOptions: { prepayment: { amount: 6000 } },
		});
		await engine.start("a");
		expect(store.apps.get("a")?.currentStage).toBe("prepayment");
		expect(store.stage("a", "prepayment")).toBe("active");
	});

	it("skips a stage whose plugin says it does not apply", async () => {
		store.add({ id: "a", pipeline: ["prepayment", "interview"] });
		await engine.start("a");
		expect(store.stage("a", "prepayment")).toBe("skipped");
		expect(store.apps.get("a")?.currentStage).toBe("interview");
	});

	it("enrols straight away when the pipeline is empty (free course)", async () => {
		store.add({ id: "a", pipeline: engine.pipelineFor("free") });
		await engine.start("a");
		expect(store.apps.get("a")?.status).toBe("enrolled");
		expect(emitted).toContain("application.enrolled");
	});

	it("walks through every stage to enrolment", async () => {
		store.add({ id: "a", pipeline: ["interview", "documents"] });
		await engine.start("a");
		await engine.complete("a", "interview");
		expect(store.apps.get("a")?.currentStage).toBe("documents");
		await engine.complete("a", "documents");
		expect(store.apps.get("a")).toMatchObject({ status: "enrolled", currentStage: null });
		expect(emitted).toEqual([
			"stage.entered",
			"stage.completed",
			"stage.entered",
			"stage.completed",
			"application.enrolled",
		]);
	});

	it("rejects the application when a stage fails", async () => {
		store.add({ id: "a", pipeline: ["interview", "documents"] });
		await engine.start("a");
		await engine.reject("a", "interview", { reason: "not a fit" });
		expect(store.apps.get("a")?.status).toBe("rejected");
		expect(store.stage("a", "interview")).toBe("failed");
		await expect(engine.complete("a", "interview")).rejects.toThrow(PipelineError);
	});

	it("refuses to complete a stage that is not current", async () => {
		store.add({ id: "a", pipeline: ["interview", "documents"] });
		await engine.start("a");
		await expect(engine.complete("a", "documents")).rejects.toThrow(/not the current stage/);
	});

	it("rolls back and emits nothing when a step fails", async () => {
		store.add({ id: "a", pipeline: ["interview"] });
		await engine.start("a");
		emitted = [];
		store.updateStage = async () => {
			throw new Error("db down");
		};
		await expect(engine.complete("a", "interview")).rejects.toThrow("db down");
		expect(store.apps.get("a")?.currentStage).toBe("interview");
		expect(emitted).toEqual([]);
	});
});

describe("PipelineEngine transactions", () => {
	let config: ReturnType<typeof resolveConfig>;
	let store: MemoryStore;
	let engine: PipelineEngine;

	beforeEach(() => {
		config = resolveConfig(baseConfig());
		store = new MemoryStore();
		engine = new PipelineEngine(config, store);
	});

	it("passes the transaction to onEnter and to hooks", async () => {
		const seen: unknown[] = [];
		const plugin = definePlugin({
			id: "p",
			name: "P",
			version: "0",
			stages: [
				defineStage({
					id: "s",
					label: "s",
					onEnter: ({ db }) => {
						seen.push(db);
						return "wait";
					},
				}),
			],
		});
		config = resolveConfig(baseConfig({ plugins: [plugin], pipelines: { default: ["s"] } }));
		config.hooks.on("stage.entered", (_payload, db) => {
			seen.push(db);
		});
		engine = new PipelineEngine(config, store);
		store.add({ id: "a", pipeline: ["s"] });
		await engine.start("a");
		expect(seen).toEqual([store.db, store.db]);
	});

	it("rolls back the stage change when a hook fails", async () => {
		const events: string[] = [];
		config.events.on("stage.completed", () => {
			events.push("completed");
		});
		store.add({ id: "a", pipeline: ["interview", "documents"] });
		await engine.start("a");
		config.hooks.on("stage.entered", ({ stage }) => {
			if (stage === "documents") throw new Error("could not create rows");
		});
		await expect(engine.complete("a", "interview")).rejects.toThrow("could not create rows");
		expect(store.apps.get("a")?.currentStage).toBe("interview");
		expect(events).toEqual([]);
	});

	it("commits an effect with the stage change, and its events after commit", async () => {
		const published: string[] = [];
		config.events.on("payment.paid", () => {
			published.push("payment.paid");
		});
		store.add({ id: "a", pipeline: ["interview"] });
		await engine.start("a");
		await engine.complete("a", "interview", {
			effect: ({ emit }) => {
				store.writes.push("paid");
				emit("payment.paid", { paymentId: "p1" });
			},
		});
		expect(store.writes).toEqual(["paid"]);
		expect(published).toEqual(["payment.paid"]);
	});

	it("with ifCurrent, keeps the effect but leaves a stage that is not current alone", async () => {
		store.add({ id: "a", pipeline: ["interview", "documents"] });
		await engine.start("a");
		const advanced = await engine.complete("a", "documents", {
			ifCurrent: true,
			effect: () => {
				store.writes.push("paid");
			},
		});
		expect(advanced).toBe(false);
		expect(store.writes).toEqual(["paid"]);
		expect(store.apps.get("a")?.currentStage).toBe("interview");
	});

	it("rolls back an effect when the stage is not current", async () => {
		store.add({ id: "a", pipeline: ["interview", "documents"] });
		await engine.start("a");
		await expect(
			engine.complete("a", "documents", {
				effect: () => {
					store.writes.push("paid");
				},
			}),
		).rejects.toThrow(PipelineError);
		expect(store.writes).toEqual([]);
	});

	it("runs standalone work with hooks inside and events after commit", async () => {
		const order: string[] = [];
		config.hooks.on("payment.refunded", () => {
			order.push("hook");
		});
		config.events.on("payment.refunded", () => {
			order.push("event");
		});
		const result = await engine.transaction(async ({ emit }) => {
			order.push("work");
			emit("payment.refunded", { paymentId: "p1" });
			return 42;
		});
		expect(result).toBe(42);
		expect(order).toEqual(["work", "hook", "event"]);
	});
});

describe("resolveConfig", () => {
	it("rejects a pipeline that uses a stage no plugin provides", () => {
		expect(() => resolveConfig(baseConfig({ pipelines: { default: ["payment"] } }))).toThrow(
			/no enabled plugin provides it/,
		);
	});

	it("rejects a plugin whose dependency is disabled", () => {
		const plugin = definePlugin({ id: "x", name: "X", version: "0", dependsOn: ["payments"] });
		expect(() => resolveConfig(baseConfig({ plugins: [stagesPlugin, plugin] }))).toThrow(
			ConfigError,
		);
	});

	it("keeps the attribution unless a white-label licence is present", () => {
		expect(resolveConfig(baseConfig()).brand.poweredBy).toBe(true);
		expect(() =>
			resolveConfig(baseConfig({ brand: { name: "T", slug: "t", poweredBy: false } })),
		).toThrow(/white-label/);
	});

	describe("licences", () => {
		const { privateKey, publicKey } = generateKeyPairSync("ed25519");
		const verifier = createLicenseVerifier(
			publicKey.export({ type: "spki", format: "pem" }).toString(),
		);
		const issue = (payload: object) => {
			const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
			return `${body}.${sign(null, Buffer.from(body), privateKey).toString("base64url")}`;
		};
		const enterprise = definePlugin({
			id: "sso",
			name: "SSO",
			version: "0",
			edition: "enterprise",
		});

		it("loads enterprise plugins and white-label with a valid licence", () => {
			const license = issue({ licensee: "Acme", features: ["sso", "white-label"] });
			const config = resolveConfig(
				baseConfig({
					plugins: [stagesPlugin, enterprise],
					license,
					brand: { name: "A", slug: "a", poweredBy: false },
				}),
				verifier,
			);
			expect(config.license?.licensee).toBe("Acme");
			expect(config.brand.poweredBy).toBe(false);
		});

		it("refuses enterprise plugins without a licence, or with a forged or expired one", () => {
			const plugins = [stagesPlugin, enterprise];
			expect(() => resolveConfig(baseConfig({ plugins }), verifier)).toThrow(/enterprise/);
			const forged = `${Buffer.from(JSON.stringify({ licensee: "x", features: ["sso"] })).toString("base64url")}.AAAA`;
			expect(() => resolveConfig(baseConfig({ plugins, license: forged }), verifier)).toThrow(
				/enterprise/,
			);
			const expired = issue({
				licensee: "x",
				features: ["sso"],
				expiresAt: "2020-01-01T00:00:00Z",
			});
			expect(() => resolveConfig(baseConfig({ plugins, license: expired }), verifier)).toThrow(
				/enterprise/,
			);
		});
	});
});
