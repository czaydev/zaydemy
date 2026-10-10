import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Integration tests share one database, so files run one at a time.
		fileParallelism: false,
		// Workspace packages ship TypeScript source; let Vite transform them.
		server: { deps: { inline: [/@zaydemy\//] } },
	},
});
