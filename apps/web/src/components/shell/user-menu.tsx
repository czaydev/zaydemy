"use client";

import { Avatar, cn, Icon } from "@zaydemy/ui";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";

export interface MenuLink {
	label: string;
	href: string;
	icon?: string;
}

/** Avatar button that opens the account menu. */
export function UserMenu({
	name,
	email,
	links,
	signOutLabel,
	align = "right",
	side = "bottom",
}: {
	name: string;
	email: string;
	links: MenuLink[];
	signOutLabel: string;
	align?: "left" | "right";
	side?: "top" | "bottom";
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const close = (event: MouseEvent | KeyboardEvent) => {
			if (
				event instanceof KeyboardEvent
					? event.key === "Escape"
					: !ref.current?.contains(event.target as Node)
			)
				setOpen(false);
		};
		document.addEventListener("mousedown", close);
		document.addEventListener("keydown", close);
		return () => {
			document.removeEventListener("mousedown", close);
			document.removeEventListener("keydown", close);
		};
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				aria-expanded={open}
				aria-haspopup="menu"
				onClick={() => setOpen(!open)}
				className="flex cursor-pointer items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted"
			>
				<Avatar name={name} />
				<span className="hidden max-w-32 truncate font-medium text-sm sm:block">{name}</span>
				<ChevronDown className="size-4 text-muted-foreground" />
			</button>
			{open ? (
				<div
					role="menu"
					className={cn(
						"absolute z-50 w-60 rounded-xl border bg-card p-1.5 shadow-lg",
						align === "right" ? "right-0" : "left-0",
						side === "top" ? "bottom-full mb-2" : "top-full mt-2",
					)}
				>
					<div className="px-2 py-2">
						<p className="truncate font-medium text-sm">{name}</p>
						<p className="truncate text-muted-foreground text-xs">{email}</p>
					</div>
					<div className="my-1 h-px bg-border" />
					{links.map((link) => (
						<a
							key={link.href}
							href={link.href}
							role="menuitem"
							className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
						>
							<Icon name={link.icon} className="size-4 text-muted-foreground" />
							{link.label}
						</a>
					))}
					{links.length > 0 ? <div className="my-1 h-px bg-border" /> : null}
					<SignOutButton label={signOutLabel} />
				</div>
			) : null}
		</div>
	);
}
