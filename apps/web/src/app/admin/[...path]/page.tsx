import { renderPluginPage } from "@/server/plugin-page";

export default function AdminPluginPage(props: PageProps<"/admin/[...path]">) {
	return renderPluginPage("admin", props);
}
