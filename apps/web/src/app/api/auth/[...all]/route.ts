import { toNextJsHandler } from "better-auth/next-js";
import { getZaydemy } from "@/server/zaydemy";

const handler = () => toNextJsHandler(getZaydemy().auth);

export const GET = (request: Request) => handler().GET(request);
export const POST = (request: Request) => handler().POST(request);
