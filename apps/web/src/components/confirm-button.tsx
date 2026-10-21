"use client";

import { Button } from "@zaydemy/ui";
import type { ComponentProps } from "react";

/** A submit button that asks for confirmation first, for actions that cannot be undone. */
export function ConfirmButton({
	confirm,
	...props
}: ComponentProps<typeof Button> & { confirm: string }) {
	return (
		<Button
			type="submit"
			{...props}
			onClick={(event) => {
				if (!window.confirm(confirm)) event.preventDefault();
			}}
		/>
	);
}
