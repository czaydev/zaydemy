import type { CheckoutProps } from "@zaydemy/plugin-payments";
import { Button, Field, Input, Select } from "@zaydemy/ui";

/** Card form, or a single button when payers are sent to the provider's hosted page. */
export function cardCheckout({
	hosted,
	installments,
}: {
	hosted: boolean;
	installments: number[];
}) {
	return function CardCheckout({ payment, t }: CheckoutProps) {
		const action = `/api/payments/${payment.reference}/card`;
		if (hosted) {
			return (
				<form method="post" action={action}>
					<Button type="submit" size="lg">
						{t("paymentCard.hosted")}
					</Button>
				</form>
			);
		}
		return (
			<form method="post" action={action} autoComplete="on" className="grid max-w-md gap-4">
				<Field label={t("paymentCard.holder")} htmlFor="cardHolderName">
					<Input id="cardHolderName" name="cardHolderName" autoComplete="cc-name" required />
				</Field>
				<Field label={t("paymentCard.number")} htmlFor="cardNumber">
					<Input
						id="cardNumber"
						name="cardNumber"
						autoComplete="cc-number"
						inputMode="numeric"
						pattern="[0-9 ]{12,23}"
						placeholder="0000 0000 0000 0000"
						className="font-mono"
						required
					/>
				</Field>
				<div className="grid grid-cols-3 gap-3">
					<Field label={t("paymentCard.month")} htmlFor="expireMonth">
						<Input
							id="expireMonth"
							name="expireMonth"
							autoComplete="cc-exp-month"
							inputMode="numeric"
							placeholder="MM"
							maxLength={2}
							required
						/>
					</Field>
					<Field label={t("paymentCard.year")} htmlFor="expireYear">
						<Input
							id="expireYear"
							name="expireYear"
							autoComplete="cc-exp-year"
							inputMode="numeric"
							placeholder="YYYY"
							maxLength={4}
							required
						/>
					</Field>
					<Field label={t("paymentCard.cvc")} htmlFor="cvc">
						<Input
							id="cvc"
							name="cvc"
							autoComplete="cc-csc"
							inputMode="numeric"
							maxLength={4}
							required
						/>
					</Field>
				</div>
				{installments.length > 1 ? (
					<Field label={t("paymentCard.installment")} htmlFor="installment">
						<Select id="installment" name="installment" defaultValue="1">
							{installments.map((n) => (
								<option key={n} value={n}>
									{n === 1 ? t("paymentCard.single") : n}
								</option>
							))}
						</Select>
					</Field>
				) : null}
				<div>
					<Button type="submit" size="lg">
						{t("paymentCard.pay")}
					</Button>
				</div>
			</form>
		);
	};
}
