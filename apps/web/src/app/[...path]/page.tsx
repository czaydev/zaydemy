import { renderPluginPage } from "@/server/plugin-page";

export default function AppPluginPage(props: PageProps<"/[...path]">) {
	return renderPluginPage("app", props);
}
