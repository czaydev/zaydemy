import { definePlugin, type SmsSender } from "@zaydemy/core";

export interface EkomesajOptions {
	username: string;
	password: string;
	/** Approved sender name (originator) on your Ekomesaj account. */
	sender: string;
	endpoint?: string;
}

/** Sends text messages through Ekomesaj (Turkey). Numbers are E.164, e.g. `+905551112233`. */
export function ekomesajSender({
	username,
	password,
	sender,
	endpoint = "http://panel4.ekomesaj.com:9587/sms/create",
}: EkomesajOptions): SmsSender {
	const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
	return {
		async send({ to, text }) {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { Authorization: authorization, "Content-Type": "application/json" },
				body: JSON.stringify({
					type: 1,
					sendingType: 0,
					title: sender,
					content: text,
					number: to.replace(/^\+/, ""),
					encoding: 0,
					sender,
					validity: 60,
					commercial: false,
					skipAhsQuery: true,
				}),
			});
			if (!response.ok) {
				throw new Error(`Ekomesaj responded ${response.status}: ${await response.text()}`);
			}
		},
	};
}

export function ekomesajSms(options: EkomesajOptions) {
	return definePlugin({
		id: "sms-ekomesaj",
		name: "Ekomesaj SMS",
		version: "0.1.0",
		sms: ekomesajSender(options),
	});
}
