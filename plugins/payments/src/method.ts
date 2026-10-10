import type { Locale, PluginSession, Translate } from "@zaydemy/core";
import type { Payment } from "./schema";

/** Extension point where payment method plugins register themselves. */
export const PAYMENT_METHODS = "payments.methods";

export interface CheckoutProps {
	payment: Payment;
	session: PluginSession;
	searchParams: Record<string, string | string[] | undefined>;
	locale: Locale;
	t: Translate;
}

/**
 * A way to pay, contributed by a plugin such as payment-card or
 * payment-bank-transfer:
 * `contributes: { [PAYMENT_METHODS]: [method] }`.
 */
export interface PaymentMethod {
	/** Stored on the payment, e.g. `card`. */
	id: string;
	/** i18n key for the method's name. */
	label: string;
	/** Server component shown on the checkout page while the payment is open. */
	Checkout: (props: CheckoutProps) => unknown;
	/** Returns the money through the provider. Without it, refunds are recorded by staff only. */
	refund?: (payment: Payment) => Promise<void>;
}
