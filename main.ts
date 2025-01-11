import * as pt from "npm:puppeteer";
import UserAgent from "npm:user-agents";
import { DOMParser } from "jsr:@b-fuze/deno-dom";
import { assert } from "jsr:@std/assert";

export function add(a: number, b: number): number {
	return a + b;
}

const userAgentGen = new UserAgent({
	deviceCategory: "desktop",
});

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
	main();
}

function randomUserAgent(): string {
	return userAgentGen.random().toString();
}

function timeout(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	const browser = await pt.launch({
		browser: "firefox",
		headless: true,
	});
	const scraper = new RedwoodRPM();
	const page = await browser.newPage();
	await page.setUserAgent(randomUserAgent());
	//await page.goto("https://redwoodrpm.com/rent-a-home/#rental-feed-header");
	console.log("Page Loaded at: ", new Date());
	try {
		for await (const listings of scraper.nextPage(page)) {
			for await (const listing of scraper.nextListing(listings)) {
				const frame = await scraper.fetchListingDetailPage(browser, listing);
				const details = await scraper.parseListingDetail(frame);
				console.log(JSON.stringify(details));
				return;
			}
		}
	} catch (e) {
		console.error(e);
		await browser.close();
		Deno.exit(1);
	}
	await browser.close();
	Deno.exit(0);
	return;
	const frame = await page.waitForFrame((frame) =>
		frame.url().startsWith("https://redwoodrpm.appfolio.com/listings")
	);
	//const btn = await frame.("div.js-link-to-detail");
	//assert(btn !== null);
	//const href = await btn.evaluate((el) => el.getAttribute("href"));
	const hr = await frame.$eval(
		"a.btn.js-link-to-detail",
		(el) => console.log(el.constructor),
	);
	//frame.goto("https://redwoodrpm.appfolio.com/listings?1736394580026");
	console.log("Frame Loaded at: ", new Date());
	await timeout(10 * 1000);
	await browser.close();
}

async function main_dom() {
	const target = URL.parse(
		"https://redwoodrpm.appfolio.com/listings?1736394580026",
	);
	if (target === null) return;
	const req: RequestInit = {
		headers: {
			"User-Agent": randomUserAgent(),
		},
		method: "GET",
	};
	const res = await fetch(target, req);
	const text = await res.text();
	const dom = new DOMParser().parseFromString(text, "text/html");
	Deno.writeTextFileSync("redwood.html", text);
	const title = dom.querySelector("title");
	console.log(title?.textContent);
}

class Util {
	static async getAttribute(
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

	static getInnerText(
		element: ElementAny | pt.Frame,
		selector: string,
	): Promise<string> {
		return element.$eval(
			selector,
			(node) => (node as HTMLElement).innerText,
		);
	}

	static async newPageAt(browser: pt.Browser, url: string): Promise<pt.Page> {
		const page = await browser.newPage();
		page.setUserAgent(randomUserAgent());
		await page.goto(url);
		return page;
	}

	static parseUrl(url: string): URL {
		const parsed = URL.parse(url);
		if (parsed === null) {
			throw new Error("Invalid URL");
		}
		return parsed;
	}

	static async select<T extends HTMLElement>(
		element: ElementAny | pt.Frame,
		selector: string,
	): Promise<pt.ElementHandle<T>> {
		const selected = await element.$(selector);
		if (selected === null) {
			throw new Error(`No element found for selector: ${selector}`);
		}
		return selected as pt.ElementHandle<T>;
	}

	static substr(text: string, start: number, end?: number): string {
		if (end === undefined) {
			return text.substring(start);
		} else if (end < 0) {
			return text.substring(start, text.length + end);
		} else {
			return text.substring(start, end);
		}
	}

	static scrapeListing(element: ElementAny | pt.Frame, parser: ListingParser) {
		for (const [key, selector] of Object.entries(parser)) {
		}
	}
}

interface Listing {
	address?: string;
	kind?: string;
	rent?: string;
	description?: string;
	details?: string;
	url?: URL;
}

type _SelectorSingleParser = [string, (text: string) => string];
type _SelectorListParser = [string[], (text: string[]) => string];
type SelectorParser = _SelectorSingleParser | _SelectorListParser;
interface ListingParser {
	address?: SelectorParser;
	kind?: SelectorParser;
	rent?: SelectorParser;
	description?: SelectorParser;
	details?: SelectorParser;
	url?: SelectorParser;
}

type ElementAny = pt.ElementHandle<HTMLElement>;

interface ListingProvider {
	/// get the first or following page of listings
	/// the returned frame, or element, should be the next page of listings
	nextPage(page: pt.Page): AsyncGenerator<ElementAny, void, void>;
	/// on the current page,loop through each listing, returning its top level element
	nextListing(element: ElementAny): AsyncGenerator<ElementAny, void, void>;
	/// navigate to the listing detail page and return the frame
	fetchListingDetailPage(
		browser: pt.Browser,
		element: ElementAny,
	): Promise<pt.Frame>;

	parseListingDetail(frame: pt.Frame): Promise<Listing>;
}

class RedwoodRPM implements ListingProvider {
	static listingsUrl = Util.parseUrl(
		"https://redwoodrpm.com/rent-a-home/#rental-feed-header",
	);

	static listingDetailUrl(pathname: string): URL {
		const url = Util.parseUrl("https://redwoodrpm.appfolio.com");
		url.pathname = pathname;
		return url;
	}

	async fetchListingDetailPage(
		browser: pt.Browser,
		element: ElementAny,
	): Promise<pt.Frame> {
		const href: string | null = await Util.getAttribute(
			element,
			"div.listing-item__actions.js-listing-actions a.btn.btn-secondary.js-link-to-detail",
			"href",
		);
		if (href === null) {
			throw new Error("No href found");
		}
		const url = RedwoodRPM.listingDetailUrl(href).toString();
		const page = await Util.newPageAt(browser, url);
		return page.mainFrame();
	}

	async *nextPage(page: pt.Page): AsyncGenerator<ElementAny, void, void> {
		await page.goto(RedwoodRPM.listingsUrl.toString());
		const frame = await page.waitForFrame((frame) =>
			frame.url().startsWith("https://redwoodrpm.appfolio.com/listings")
		);
		const listings = await frame.$("div.listings.js-listings-container");
		if (listings === null) {
			throw new Error("No listings found");
		}
		yield listings;
	}

	async *nextListing(
		element: pt.ElementHandle,
	): AsyncGenerator<ElementAny, void, void> {
		const listings = await element.$$("div.listing-item");
		for (const listing of listings) {
			yield listing;
		}
	}

	async parseListingDetail(frame: pt.Frame): Promise<Listing> {
		const rentStr = await Util.getInnerText(
			frame,
			"::-p-xpath(/html/body/main/div[5]/div/div[2]/div[1]/h2)",
		);
		// remove the /mo from the end
		const rent = Util.substr(rentStr, 1, -4);

		const kindStr = await Util.getInnerText(
			frame,
			"::-p-xpath(/html/body/main/div[5]/div/div[1]/div[1]/p)",
		);
		const kind = kindStr.split("|")[0].trim();

		const addressStr = await Util.getInnerText(
			frame,
			"::-p-xpath(/html/body/main/div[5]/div/div[1]/div[1]/h1)",
		);
		const address = Util.substr(addressStr, 0, -4);

		const description = await Util.getInnerText(
			frame,
			"::-p-xpath(/html/body/main/div[5]/div/div[1]/p[1])",
		);

		const details1 = await Util.getInnerText(
			frame,
			"::-p-xpath(/html/body/main/div[5]/div/div[1]/div[2])",
		);
		const details2 = await Util.getInnerText(
			frame,
			"::-p-xpath(/html/body/main/div[5]/div/div[1]/div[3])",
		);
		const details = details1 + details2;

		return {
			description,
			details,
			kind,
			rent,
			address,
			url: Util.parseUrl(frame.url()),
		};
	}
}
