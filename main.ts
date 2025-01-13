import * as pt from "npm:puppeteer";
import RedwoodRPM from "./websites/redwoodrpm.ts";
import randomUserAgent from "./user_agent.ts";
import { Listing, ListingProvider, scrapeListing } from "./scrape.ts";
import Prestige from "./websites/prestige.ts";
import PurePM from "./websites/purepm.ts";
import { ElementAny } from "./puppet.ts";

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
	main();
}

async function main() {
	const browser = await pt.launch({
		browser: "firefox",
		headless: false,
		defaultViewport: { width: 1280, height: 720 },
		extraPrefsFirefox: {
			
		},
		executablePath:
			"C:/Users/db/.cache/puppeteer/firefox/win64-nightly_136.0a1/firefox/firefox.exe",
	});
	const scraper = new PurePM();
	const scrapers = [new RedwoodRPM(), new Prestige(), new PurePM()];

	const listings = await scrapeAll(scraper, browser);

	await browser.close();
	Deno.exit(0);
}

async function scrapeAll(scraper: ListingProvider, browser: pt.Browser): Promise<Listing[]> {
	const page = await browser.newPage();
	await page.setUserAgent(randomUserAgent());
	console.log(`[${new Date()}] Scraping '${scraper.PM_NAME}'`);
	const result = [];
	let count = 0;
	try {
		for await (const listingListElement of scraper.nextPage(page)) {
			console.log("Next Page");
			for await (const listingElement of scraper.nextListing(listingListElement)) {
				console.log("Next Listing");
				try {
					const data = await scrapeFrame(scraper, browser, listingElement);
					console.log(data);
					result.push(data);
				} catch (e) {
					console.error(`Error scraping '${scraper.PM_NAME}'\n`, e);
				}
				count++;
				if (count >= 3) break;
			}
		}
	} catch (e) {
		console.error(`Error scraping '${scraper.PM_NAME}'\n`, e);
	}
	await page.close();
	return result;
}

async function scrapeFrame(
	scraper: ListingProvider,
	browser: pt.Browser,
	listingElement: ElementAny,
): Promise<Listing> {
	let data: Listing = {};
	const detailsFrame = await scraper.fetchListingDetailPage(browser, listingElement);
	try {
		data = await scrapeListing(
			detailsFrame,
			scraper.listingParser,
		);
		data.url = detailsFrame.url();
		data.pm = scraper.PM_NAME;
	} catch (e) {
		throw e;
	} finally {
		await detailsFrame.page().close();
	}
	return data;
}
