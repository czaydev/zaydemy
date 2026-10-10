import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { definePlugin, type StorageDriver } from "@zaydemy/core";

/** Maps a storage key to a path inside `root`, refusing keys that would escape it. */
export function pathFor(root: string, key: string): string {
	const base = resolve(root);
	const path = resolve(base, key);
	if (!path.startsWith(base + sep)) throw new Error(`Invalid storage key "${key}".`);
	return path;
}

export function localStorageDriver(root: string): StorageDriver {
	return {
		async put(key, body) {
			const path = pathFor(root, key);
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, body);
		},
		async get(key) {
			try {
				return { body: new Uint8Array(await readFile(pathFor(root, key))) };
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
				throw error;
			}
		},
		async delete(key) {
			await rm(pathFor(root, key), { force: true });
		},
	};
}

/** Stores uploads on the server's disk. Suits single-server installs and development. */
export function localFileStorage({ root = "./storage" }: { root?: string } = {}) {
	return definePlugin({
		id: "storage-local",
		name: "Local file storage",
		version: "0.1.0",
		storage: localStorageDriver(root),
	});
}
