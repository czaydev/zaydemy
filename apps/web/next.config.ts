import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
	// Workspace packages and plugins ship TypeScript source.
	transpilePackages: Object.keys(pkg.dependencies).filter((name) => name.startsWith("@zaydemy/")),
	serverExternalPackages: ["pg", "@sentry/node"],
};

export default nextConfig;
