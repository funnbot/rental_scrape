import { Browser, ElementHandle, Frame, Page } from "npm:puppeteer";
import {
	ElementAny,
	getAttribute,
	getInnerText,
	newPageAt,
	parseUrl,
	substr,
	waitForSelector,
} from "../puppet.ts";
import { Listing, ListingParser, ListingProvider } from "../scrape.ts";
import { _throw } from "../truthy.ts";
import { selectAll, xp } from "../puppet.ts";
import { withPathname } from "../scrape.ts";

export default class Prestige extends ListingProvider {
	PM_NAME = "Prestige Real Estate and Property Management";

	LISTINGS_URL: URL = parseUrl(
		"https://prestigerealestateandpropertymanagement.managebuilding.com/Resident/public/rentals?bedrooms=0&bathrooms=0&location=Santa%20Rosa",
	);
	LISTING_DETAIL_BASE_URL: URL = parseUrl(
		"https://prestigerealestateandpropertymanagement.managebuilding.com",
	);
	async *nextPage(page: Page): AsyncGenerator<ElementAny, void, void> {
		await page.goto(this.LISTINGS_URL.toString());
		const frame = page.mainFrame();

		const container = await waitForSelector(frame, xp`/html/body/div[5]/div/div[1]`);
		yield container;
	}
	async *nextListing(element: ElementAny): AsyncGenerator<ElementAny, void, void> {
		const listings = await selectAll(element, xp`/html/body/div[5]/div/div[1]/a`);
		for (const listing of listings) {
			yield listing;
		}
	}
	async fetchListingDetailPage(browser: Browser, element: ElementAny): Promise<Frame> {
		const href = await element.evaluate((el) => el.getAttribute("href")) ?? _throw("No href found");
		const url = withPathname(this.LISTING_DETAIL_BASE_URL, href);
		const page = await newPageAt(browser, url.toString());
		return page.mainFrame();
	}
	listingParser: ListingParser = {
		rent: ["/html/body/div[5]/div/div/div[2]/div[2]/div[1]", (text: string) => substr(text, 1, -8)],
		available: ["/html/body/div[5]/div/div/div[2]/div[2]/div[3]", (text: string) => text],
		description: ["/html/body/div[5]/div/div/div[2]/div[2]/p[1]", (text: string) => text],
		kind: ["/html/body/div[5]/div/div/div[2]/div[2]/ul", (text: string) => text],
		image: ["/html/body/div[5]/div/div/div[2]/div[1]/div[1]/img", "src", (text: string) => text],
		address: ["/html/body/div[5]/div/div/div[1]/h1", (text: string) => text],
	};
}
