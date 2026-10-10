import { getTranslator } from "@/server/i18n";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
	const t = await getTranslator();
	const keys = [
		"title",
		"signUpTitle",
		"name",
		"email",
		"password",
		"submit",
		"toSignUp",
		"toSignIn",
		"failed",
	] as const;
	const labels = Object.fromEntries(keys.map((key) => [key, t(`auth.${key}`)])) as Record<
		(typeof keys)[number],
		string
	>;
	return (
		<main>
			<SignInForm labels={labels} />
		</main>
	);
}
