import type { CheckoutProps } from "@zaydemy/plugin-payments";

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
					<button type="submit">{t("paymentCard.hosted")}</button>
				</form>
			);
		}
		return (
			<form method="post" action={action} autoComplete="on">
				<label>
					{t("paymentCard.holder")}
					<input name="cardHolderName" autoComplete="cc-name" required />
				</label>
				<label>
					{t("paymentCard.number")}
					<input
						name="cardNumber"
						autoComplete="cc-number"
						inputMode="numeric"
						pattern="[0-9 ]{12,23}"
						required
					/>
				</label>
				<label>
					{t("paymentCard.month")}
					<input
						name="expireMonth"
						autoComplete="cc-exp-month"
						inputMode="numeric"
						maxLength={2}
						required
					/>
				</label>
				<label>
					{t("paymentCard.year")}
					<input
						name="expireYear"
						autoComplete="cc-exp-year"
						inputMode="numeric"
						maxLength={4}
						required
					/>
				</label>
				<label>
					{t("paymentCard.cvc")}
					<input name="cvc" autoComplete="cc-csc" inputMode="numeric" maxLength={4} required />
				</label>
				{installments.length > 1 ? (
					<label>
						{t("paymentCard.installment")}
						<select name="installment" defaultValue="1">
							{installments.map((n) => (
								<option key={n} value={n}>
									{n === 1 ? t("paymentCard.single") : n}
								</option>
							))}
						</select>
					</label>
				) : null}
				<button type="submit">{t("paymentCard.pay")}</button>
			</form>
		);
	};
}
