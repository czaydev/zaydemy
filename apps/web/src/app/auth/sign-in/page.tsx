import { getTranslator } from "@/server/i18n";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
	searchParams,
}: {
	searchParams: Promise<{ mode?: string }>;
}) {
	const [t, { mode }] = await Promise.all([getTranslator(), searchParams]);
	const keys = [
		"title",
		"subtitle",
		"signUpTitle",
		"signUpSubtitle",
		"name",
		"email",
		"emailPlaceholder",
		"password",
		"passwordHint",
		"submit",
		"signUpSubmit",
		"noAccount",
		"toSignUp",
		"hasAccount",
		"toSignIn",
		"failed",
		"signUpFailed",
		"google",
		"or",
	] as const;
	const labels = Object.fromEntries(keys.map((key) => [key, t(`auth.${key}`)])) as Record<
		(typeof keys)[number],
		string
	>;
	return (
		<SignInForm
			labels={labels}
			initialMode={mode === "sign-up" ? "signUp" : "signIn"}
			google={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
		/>
	);
}
