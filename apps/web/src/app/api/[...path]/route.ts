import { handlePluginApi } from "@/server/plugin-api";

// Plugin API routes; `/api/auth/*` is served by its own, more specific route.
export const GET = handlePluginApi;
export const POST = handlePluginApi;
export const PUT = handlePluginApi;
export const PATCH = handlePluginApi;
export const DELETE = handlePluginApi;
