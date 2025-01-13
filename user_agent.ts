import UserAgent from "npm:user-agents";

const userAgentGen = new UserAgent({
	deviceCategory: "desktop",
});

export default function randomUserAgent(): string {
	return userAgentGen.random().toString();
}
