// https://developer.mozilla.org/en-US/docs/Glossary/Falsy
type Falsy = false | 0 | -0 | 0n | "" | null | undefined;

export function truthy<T>(expr: T, msg = ""): Exclude<T, Falsy> {
	if (!expr) throw new Error(msg);
	return expr as Exclude<T, Falsy>;
}

export function _throw(msg: string): never {
	throw new Error(msg);
}
