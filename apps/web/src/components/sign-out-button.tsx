"use client";

import { authClient } from "@zaydemy/auth/client";
import { useRouter } from "next/navigation";

export function SignOutButton({ label }: { label: string }) {
	const router = useRouter();
	return (
		<button
			type="button"
			onClick={async () => {
				await authClient.signOut();
				router.push("/");
				router.refresh();
			}}
		>
			{label}
		</button>
	);
}
