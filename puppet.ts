import * as pt from "npm:puppeteer";

import randomUserAgent from "./user_agent.ts";
import { _throw } from "./truthy.ts";

export type ElementAny = pt.ElementHandle<HTMLElement>;

export async function getAttribute(
	element: ElementAny | pt.Frame,
	selector: string,
	attr: string,
): Promise<string> {
	const value = await element.$eval(
		selector,
		(node, attr) => node.getAttribute(attr),
		attr,
	);
	if (value === null) {
		throw new Error(
			`No attribute '${attr}' found for selector '${selector}'`,
		);
	}
	return value;
}

export async function getInnerText(
	element: ElementAny | pt.Frame,
	selector: string,
): Promise<string> {
	const text = await element.$eval(
		selector,
		(node) => (node as HTMLElement).innerText,
	);
	return text;
}

export async function isHidden(
	element: ElementAny,
	selector: string,
): Promise<boolean> {
	const attrs: NamedNodeMap = (await element.$eval(selector, (node) => node.attributes)) ??
		_throw("no element found");

	const checkStyle = attrs.getNamedItem("style")?.value.includes("display: none");
	if (checkStyle !== undefined && checkStyle === true) return true;

	const checkClass = attrs.getNamedItem("class")?.value.split(" ").includes("hidden");
	if (checkClass !== undefined && checkClass === true) return true;

	const checkDisabled = attrs.getNamedItem("disabled") !== null;
	if (checkDisabled) return true;

	return false;
}

export async function newPageAt(
	browser: pt.Browser,
	url: string,
): Promise<pt.Page> {
	const page = await browser.newPage();
	page.setUserAgent(randomUserAgent());
	await page.goto(url);
	return page;
}

export function parseUrl(url: string): URL {
	const parsed = URL.parse(url);
	if (parsed === null) {
		throw new Error("Invalid URL");
	}
	return parsed;
}

export async function select<T extends HTMLElement = HTMLElement>(
	element: ElementAny | pt.Frame,
	selector: string,
): Promise<pt.ElementHandle<T>> {
	const selected = await element.$(selector);
	if (selected === null) {
		throw new Error(`No element found for selector: ${selector}`);
	}
	return selected as pt.ElementHandle<T>;
}

export async function selectAll<T extends HTMLElement = HTMLElement>(
	element: ElementAny | pt.Frame,
	selector: string,
): Promise<pt.ElementHandle<T>[]> {
	const selected = await element.$$(selector);
	if (selected.length === 0) {
		throw new Error(`No elements found for selector: ${selector}`);
	}
	return selected as pt.ElementHandle<T>[];
}

export async function waitForSelector<T extends HTMLElement = HTMLElement>(
	element: ElementAny | pt.Frame,
	selector: string,
): Promise<pt.ElementHandle<T>> {
	const selected = await element.waitForSelector(selector);
	if (selected === null) {
		throw new Error(`No element found for selector: ${selector}`);
	}
	return selected as pt.ElementHandle<T>;
}

export function substr(text: string, start: number, end?: number): string {
	if (end === undefined) {
		return text.substring(start);
	} else if (end < 0) {
		return text.substring(start, text.length + end);
	} else {
		return text.substring(start, end);
	}
}

// custom string formatter that adds a prefix to the string, used as template string tag
export function xp(parts: TemplateStringsArray, ...values: any[]): string {
	const result = parts
		.flatMap((part, i) => i < values.length ? [part, String(values[i])] : [part])
		.join("");
	return "::-p-xpath(" + result + ")";
}
