import { Browser, ElementHandle, Frame, Page } from "npm:puppeteer";
import { ElementAny, getAttribute, newPageAt, parseUrl, substr } from "../puppet.ts";
import { ListingParser, ListingProvider, withPathname } from "../scrape.ts";

export default class RedwoodRPM extends ListingProvider {
	PM_NAME = "Redwood Residential Property Management";

	LISTINGS_URL = parseUrl("https://redwoodrpm.com/rent-a-home/#rental-feed-header");
	LISTING_DETAIL_BASE_URL: URL = parseUrl("https://redwoodrpm.appfolio.com");

	async fetchListingDetailPage(
		browser: Browser,
		element: ElementAny,
	): Promise<Frame> {
		const href: string | null = await getAttribute(
			element,
			"div.listing-item__actions.js-listing-actions a.btn.btn-secondary.js-link-to-detail",
			"href",
		);
		if (href === null) {
			throw new Error("No href found");
		}
		const url = withPathname(this.LISTING_DETAIL_BASE_URL, href).toString();
		const page = await newPageAt(browser, url);
		return page.mainFrame();
	}

	async *nextPage(page: Page): AsyncGenerator<ElementAny, void, void> {
		await page.goto(this.LISTINGS_URL.toString());
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
		element: ElementHandle,
	): AsyncGenerator<ElementAny, void, void> {
		const listings = await element.$$("div.listing-item");
		for (const listing of listings) {
			yield listing;
		}
	}

	listingParser: ListingParser = {
		rent: [
			"/html/body/main/div[5]/div/div[2]/div[1]/h2",
			(text: string) => substr(text.replaceAll("\n", "").trim(), 1, -4),
		],
		kind: [
			"/html/body/main/div[5]/div/div[1]/div[1]/p",
			(text: string) => text.split("|")[0].trim(),
		],
		address: [
			"/html/body/main/div[5]/div/div[1]/div[1]/h1",
			(text: string) => substr(text, 0, -4),
		],
		description: [
			"/html/body/main/div[5]/div/div[1]/p[1]",
			(text: string) => text,
		],
		details: [
			[
				"/html/body/main/div[5]/div/div[1]/div[2]",
				"/html/body/main/div[5]/div/div[1]/div[3]",
			],
			(texts: string[]) => texts.join(""),
		],
	};
}
