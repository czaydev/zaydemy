import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell/admin-shell";
import { getPluginSession } from "@/server/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
	const session = await getPluginSession();
	if (!session) redirect("/auth/sign-in");
	if (session.roles.length === 0) notFound();
	return <AdminShell session={session}>{children}</AdminShell>;
}
