"use server";

import { CORE_PERMISSIONS, parseStageOptionsForm } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "../admin";
import { slugify } from "../courses";
import { getZaydemy, resolvedConfig } from "../zaydemy";

export interface CourseFormState {
	error?: "name" | "slug" | "slug_taken" | "category" | "delivery" | "pipeline" | "stage";
	/** For stage errors: `<stage>.<option>`. */
	field?: string;
	values?: Record<string, string>;
}

const DELIVERY_MODES = schema.deliveryMode.enumValues;

/** Creates or updates a course from the admin form; on success goes back to the list. */
export async function saveCourse(_: CourseFormState, form: FormData): Promise<CourseFormState> {
	await requirePermission(CORE_PERMISSIONS.manageCourses);
	const values: Record<string, string> = {};
	for (const [key, value] of form.entries()) {
		if (typeof value === "string" && key !== "deliveryModes") values[key] = value;
	}
	values.deliveryModes = form.getAll("deliveryModes").join(",");
	const fail = (error: CourseFormState["error"], field?: string): CourseFormState => ({
		error,
		field,
		values,
	});

	const id = values.id || undefined;
	const name = values.name?.trim() ?? "";
	if (!name) return fail("name");
	const slug = slugify(values.slug?.trim() || name);
	if (!slug) return fail("slug");
	const categoryId = values.categoryId;
	if (!categoryId) return fail("category");
	const deliveryModes = DELIVERY_MODES.filter((mode) =>
		form.getAll("deliveryModes").includes(mode),
	);
	if (deliveryModes.length === 0) return fail("delivery");
	const pipeline = values.pipeline || "default";
	const stages = resolvedConfig.pipelines[pipeline];
	if (!stages) return fail("pipeline");

	// Only the chosen pipeline's stages are stored; options of other stages are dropped.
	const stageOptions: Record<string, unknown> = {};
	for (const stageId of stages) {
		const stage = resolvedConfig.stages.get(stageId);
		if (!stage?.options) continue;
		const prefix = `stage.${stageId}.`;
		const raw = Object.fromEntries(
			Object.entries(values)
				.filter(([key]) => key.startsWith(prefix))
				.map(([key, value]) => [key.slice(prefix.length), value]),
		);
		const parsed = parseStageOptionsForm(stage, raw);
		if (!parsed.ok) return fail("stage", `${stageId}.${parsed.field ?? ""}`);
		if (Object.keys(parsed.options).length > 0) stageOptions[stageId] = parsed.options;
	}

	const { db } = getZaydemy();
	const [taken] = await db
		.select({ id: schema.courses.id })
		.from(schema.courses)
		.where(
			id
				? and(eq(schema.courses.slug, slug), ne(schema.courses.id, id))
				: eq(schema.courses.slug, slug),
		);
	if (taken) return fail("slug_taken");

	const row = {
		name,
		slug,
		description: values.description?.trim() || null,
		categoryId,
		deliveryModes,
		pipeline: pipeline === "default" ? null : pipeline,
		stageOptions,
		isOpen: values.isOpen === "on",
	};
	if (id) await db.update(schema.courses).set(row).where(eq(schema.courses.id, id));
	else await db.insert(schema.courses).values(row);
	revalidatePath("/admin/courses");
	redirect("/admin/courses?saved=1");
}

/** Opens or closes a course for applications, or archives it. */
export async function setCourseState(form: FormData) {
	await requirePermission(CORE_PERMISSIONS.manageCourses);
	const id = String(form.get("id"));
	const action = String(form.get("action"));
	const { db } = getZaydemy();
	const update =
		action === "archive"
			? { archivedAt: new Date(), isOpen: false }
			: action === "restore"
				? { archivedAt: null }
				: { isOpen: action === "open" };
	await db.update(schema.courses).set(update).where(eq(schema.courses.id, id));
	redirect("/admin/courses");
}

/** Adds a course category. */
export async function addCategory(form: FormData) {
	await requirePermission(CORE_PERMISSIONS.manageCourses);
	const name = String(form.get("name") ?? "").trim();
	const slug = slugify(name);
	if (name && slug) {
		await getZaydemy()
			.db.insert(schema.courseCategories)
			.values({ name, slug })
			.onConflictDoNothing();
	}
	redirect("/admin/courses");
}
