"use client";

import { authClient } from "@zaydemy/auth/client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type Labels = Record<
	| "title"
	| "signUpTitle"
	| "name"
	| "email"
	| "password"
	| "submit"
	| "toSignUp"
	| "toSignIn"
	| "failed",
	string
>;

/** E-mail and password sign-in, switchable to sign-up. */
export function SignInForm({ labels }: { labels: Labels }) {
	const router = useRouter();
	const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
	const [error, setError] = useState(false);
	const [pending, setPending] = useState(false);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const email = String(form.get("email"));
		const password = String(form.get("password"));
		setPending(true);
		const { error } =
			mode === "signIn"
				? await authClient.signIn.email({ email, password })
				: await authClient.signUp.email({ email, password, name: String(form.get("name")) });
		setPending(false);
		if (error) return setError(true);
		router.push("/");
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit}>
			<h1>{mode === "signIn" ? labels.title : labels.signUpTitle}</h1>
			{error ? <p role="alert">{labels.failed}</p> : null}
			{mode === "signUp" ? (
				<label>
					{labels.name}
					<input name="name" autoComplete="name" required />
				</label>
			) : null}
			<label>
				{labels.email}
				<input name="email" type="email" autoComplete="email" required />
			</label>
			<label>
				{labels.password}
				<input
					name="password"
					type="password"
					minLength={8}
					autoComplete={mode === "signIn" ? "current-password" : "new-password"}
					required
				/>
			</label>
			<button type="submit" disabled={pending}>
				{labels.submit}
			</button>
			<button
				type="button"
				onClick={() => {
					setMode(mode === "signIn" ? "signUp" : "signIn");
					setError(false);
				}}
			>
				{mode === "signIn" ? labels.toSignUp : labels.toSignIn}
			</button>
		</form>
	);
}
