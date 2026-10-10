import {
	Banknote,
	Bell,
	BookOpen,
	Calendar,
	ChartColumn,
	Circle,
	ClipboardList,
	CreditCard,
	FileCheck,
	FileText,
	GraduationCap,
	House,
	Landmark,
	Link,
	List,
	type LucideIcon,
	type LucideProps,
	Mail,
	MessageSquare,
	Plus,
	Settings,
	Signature,
	Users,
	Video,
	Wallet,
} from "lucide-react";

/**
 * Icons plugins can name in their navigation entries (`icon: "wallet"`).
 * Unknown names fall back to a dot rather than failing.
 */
export const icons: Record<string, LucideIcon> = {
	banknote: Banknote,
	bell: Bell,
	"book-open": BookOpen,
	calendar: Calendar,
	chart: ChartColumn,
	"clipboard-list": ClipboardList,
	"credit-card": CreditCard,
	"file-check": FileCheck,
	"file-text": FileText,
	"graduation-cap": GraduationCap,
	home: House,
	landmark: Landmark,
	link: Link,
	list: List,
	mail: Mail,
	message: MessageSquare,
	plus: Plus,
	settings: Settings,
	signature: Signature,
	users: Users,
	video: Video,
	wallet: Wallet,
};

export function Icon({ name, ...props }: { name?: string } & LucideProps) {
	const Component = (name && icons[name]) || Circle;
	return <Component aria-hidden {...props} />;
}
