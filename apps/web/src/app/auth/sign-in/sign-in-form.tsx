"use client";

import { authClient } from "@zaydemy/auth/client";
import { Alert, Button, Field, Input } from "@zaydemy/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type Labels = Record<
	| "title"
	| "subtitle"
	| "signUpTitle"
	| "signUpSubtitle"
	| "name"
	| "email"
	| "emailPlaceholder"
	| "password"
	| "passwordHint"
	| "submit"
	| "signUpSubmit"
	| "noAccount"
	| "toSignUp"
	| "hasAccount"
	| "toSignIn"
	| "failed"
	| "signUpFailed"
	| "google"
	| "or",
	string
>;

function GoogleLogo() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden>
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
			/>
		</svg>
	);
}

/** E-mail and password sign-in, switchable to sign-up, with Google when configured. */
export function SignInForm({
	labels,
	initialMode,
	google,
}: {
	labels: Labels;
	initialMode: "signIn" | "signUp";
	google: boolean;
}) {
	const router = useRouter();
	const [mode, setMode] = useState(initialMode);
	const [error, setError] = useState(false);
	const [pending, setPending] = useState(false);
	const signUp = mode === "signUp";

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const email = String(form.get("email"));
		const password = String(form.get("password"));
		setPending(true);
		const { error } = signUp
			? await authClient.signUp.email({ email, password, name: String(form.get("name")) })
			: await authClient.signIn.email({ email, password });
		setPending(false);
		if (error) return setError(true);
		router.push("/");
		router.refresh();
	}

	return (
		<div className="grid gap-6">
			<div className="grid gap-1.5">
				<h1 className="font-semibold text-2xl tracking-tight">
					{signUp ? labels.signUpTitle : labels.title}
				</h1>
				<p className="text-muted-foreground text-sm">
					{signUp ? labels.signUpSubtitle : labels.subtitle}
				</p>
			</div>

			{google ? (
				<>
					<Button
						variant="outline"
						className="w-full"
						onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
					>
						<GoogleLogo />
						{labels.google}
					</Button>
					<div className="flex items-center gap-3 text-muted-foreground text-xs">
						<span className="h-px flex-1 bg-border" />
						{labels.or}
						<span className="h-px flex-1 bg-border" />
					</div>
				</>
			) : null}

			<form onSubmit={onSubmit} className="grid gap-4">
				{error ? (
					<Alert variant="destructive">{signUp ? labels.signUpFailed : labels.failed}</Alert>
				) : null}
				{signUp ? (
					<Field label={labels.name} htmlFor="name">
						<Input id="name" name="name" autoComplete="name" required />
					</Field>
				) : null}
				<Field label={labels.email} htmlFor="email">
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="email"
						placeholder={labels.emailPlaceholder}
						required
					/>
				</Field>
				<Field
					label={labels.password}
					htmlFor="password"
					hint={signUp ? labels.passwordHint : undefined}
				>
					<Input
						id="password"
						name="password"
						type="password"
						minLength={8}
						autoComplete={signUp ? "new-password" : "current-password"}
						required
					/>
				</Field>
				<Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
					{signUp ? labels.signUpSubmit : labels.submit}
				</Button>
			</form>

			<p className="text-center text-muted-foreground text-sm">
				{signUp ? labels.hasAccount : labels.noAccount}{" "}
				<button
					type="button"
					className="cursor-pointer font-medium text-primary hover:underline"
					onClick={() => {
						setMode(signUp ? "signIn" : "signUp");
						setError(false);
					}}
				>
					{signUp ? labels.toSignIn : labels.toSignUp}
				</button>
			</p>
		</div>
	);
}
