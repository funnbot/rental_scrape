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

export default class PurePM extends ListingProvider {
	PM_NAME = "Pure Property Management";

	LISTINGS_URL: URL = parseUrl(
		"https://northbay.purepm.co/rentals/#residential-listings",
	);
	LISTING_DETAIL_BASE_URL: URL = parseUrl("https://app.tenantturner.com");

	async *nextPage(page: Page): AsyncGenerator<ElementAny, void, void> {
		await page.goto(this.LISTINGS_URL.toString());
		const frame = page.mainFrame();
		const container = await waitForSelector(
			frame,
			xp`/html/body/div[2]/div[2]/div/article/div/div/div/div[3]/div[3]/div/div/div/div/div[3]/div[2]`,
		);
		yield container;
	}

	async *nextListing(element: ElementAny): AsyncGenerator<ElementAny, void, void> {
		const listings = await selectAll(
			element,
			xp`/html/body/div[2]/div[2]/div/article/div/div/div/div[3]/div[3]/div/div/div/div/div[3]/div[2]/div`,
		);
		for (const listing of listings) {
			const city = await listing.evaluate((el) => el.getAttribute("data-city"));
			if (city !== "Santa Rosa") {
				continue;
			}
			yield listing;
		}
	}

	async fetchListingDetailPage(browser: Browser, element: ElementAny): Promise<Frame> {
		const url = await getAttribute(element, "div.tt-rental-row div.tt-col2 h4 a", "href");
		if (!URL.canParse(url)) {
			throw new Error(`Invalid details page url: ${url}`);
		}
		const page = await newPageAt(browser, url);
		return page.mainFrame();
	}

	async scrapeListing(listElem: ElementAny, detailElem: ElementAny): Promise<Listing> {
		return {
			available: "now",
		};
	}

	listingParser: ListingParser = {
		//rent: ["/html/body/div[5]/div/div/div[2]/div[2]/div[1]", (text: string) => substr(text, 1, -8)],
		available: [
			'/html/body/div[1]/main/div/form/div[2]/div/div[2]/div/div/div/div[4]/table/tbody/tr/th[text()="Available"]/../td',
			(text: string) => text,
		],
		//description: ["/html/body/div[5]/div/div/div[2]/div[2]/p[1]", (text: string) => text],
		//kind: ["/html/body/div[5]/div/div/div[2]/div[2]/ul", (text: string) => text],
		//image: ["/html/body/div[5]/div/div/div[2]/div[1]/div[1]/img", "src", (text: string) => text],
		//address: ["/html/body/div[5]/div/div/div[1]/h1", (text: string) => text],
	};
}

function innerText(element: ElementAny, selector?: string): Promise<string> {
	if (selector === undefined) {
		return element.evaluate((el) => el.innerText);
	} else {
		return element.$eval(selector, (el) => (el as HTMLElement).innerText);
	}
}

async function attribute(element: ElementAny, attr: string, selector?: string): Promise<string> {
	let text: string | null = null;
	if (selector === undefined) {
		text = await element.evaluate((el, attr) => el.getAttribute(attr), attr);
	} else {
		text = await element.$eval(selector, (el, attr) => el.getAttribute(attr), attr);
	}
	if (text === null) {
		throw new Error(`No attribute '${attr}' found`);
	}
	return text;
}
