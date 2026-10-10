import { definePlugin, type StorageDriver } from "@zaydemy/core";

export interface BunnyStorageOptions {
	/** Storage zone name. */
	zone: string;
	/** The zone's password (FTP & API access). */
	accessKey: string;
	/** Regional endpoint, e.g. `storage.bunnycdn.com` (Falkenstein) or `uk.storage.bunnycdn.com`. */
	host?: string;
}

export function bunnyStorageDriver({
	zone,
	accessKey,
	host = "storage.bunnycdn.com",
}: BunnyStorageOptions): StorageDriver {
	const url = (key: string) =>
		`https://${host}/${encodeURIComponent(zone)}/${key.split("/").map(encodeURIComponent).join("/")}`;
	const headers = { AccessKey: accessKey };

	return {
		async put(key, body, contentType) {
			const response = await fetch(url(key), {
				method: "PUT",
				headers: { ...headers, "Content-Type": contentType || "application/octet-stream" },
				body: body as Uint8Array<ArrayBuffer>,
			});
			if (!response.ok) throw new Error(`Bunny upload failed: ${response.status}`);
		},
		async get(key) {
			const response = await fetch(url(key), { headers });
			if (response.status === 404) return null;
			if (!response.ok) throw new Error(`Bunny download failed: ${response.status}`);
			return {
				body: new Uint8Array(await response.arrayBuffer()),
				contentType: response.headers.get("content-type") ?? undefined,
			};
		},
		async delete(key) {
			const response = await fetch(url(key), { method: "DELETE", headers });
			if (!response.ok && response.status !== 404) {
				throw new Error(`Bunny delete failed: ${response.status}`);
			}
		},
	};
}

/** Stores uploads in a Bunny.net storage zone. */
export function bunnyStorage(options: BunnyStorageOptions) {
	return definePlugin({
		id: "storage-bunny",
		name: "Bunny.net storage",
		version: "0.1.0",
		storage: bunnyStorageDriver(options),
	});
}
