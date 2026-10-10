"use client";

import { authClient } from "@zaydemy/auth/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function SignOutButton({ label }: { label: string }) {
	const router = useRouter();
	return (
		<button
			type="button"
			className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground"
			onClick={async () => {
				await authClient.signOut();
				router.push("/");
				router.refresh();
			}}
		>
			<LogOut />
			{label}
		</button>
	);
}
