import * as pt from "npm:puppeteer";
import { ElementAny, getAttribute, getInnerText, xp } from "./puppet.ts";

export interface Listing {
	address?: string;
	kind?: string;
	rent?: string;
	description?: string;
	details?: string;
	available?: string;
	image?: string;
	waitlist?: string;

	url?: string;
	pm?: string;
}

type _SelectorSingleParser = [string, (text: string) => string];
type _SelectorListParser = [string[], (text: string[]) => string];
type InnerTextExtractor = _SelectorSingleParser | _SelectorListParser;
/**
 * selector, attribute, cleanup function
 */
type AttributeExtractor = [string, string, (text: string) => string];
export type ListingParser = {
	address?: InnerTextExtractor;
	kind?: InnerTextExtractor;
	rent?: InnerTextExtractor;
	description?: InnerTextExtractor;
	details?: InnerTextExtractor;
	available?: InnerTextExtractor;
	image?: AttributeExtractor;
	waitlist?: InnerTextExtractor;
};

export abstract class ListingProvider {
	abstract PM_NAME: string;
	/**
	 * the url to use for the listings page
	 */
	abstract LISTINGS_URL: URL;
	/**
	 * the base url for the listing detail page
	 */
	abstract LISTING_DETAIL_BASE_URL: URL;

	/**
	 * get the first or following page of listings
	 * the returned frame, or element, is the next page of listings, and is the parent of the listings
	 * @param page page used to navigate
	 * @async
	 * @generator
	 */
	abstract nextPage(page: pt.Page): AsyncGenerator<ElementAny, void, void>;
	/**
	 * on the current page, loop through each listing, returning its top level element
	 * @param element the parent element of the listings
	 * @async
	 * @generator
	 */
	abstract nextListing(element: ElementAny): AsyncGenerator<ElementAny, void, void>;
	/**
	 * navigate to the listing detail page and return the frame
	 * @param browser browser used to create the new page
	 * @param element the listing element returned from nextListing
	 * @async
	 */
	abstract fetchListingDetailPage(
		browser: pt.Browser,
		element: ElementAny,
	): Promise<pt.Frame>;

	/**
	 * a custom parser for the listing details page
	 * where each key has a xpath selector and a cleanup text function
	 */
	abstract listingParser: ListingParser;
}

export function withPathname(url: URL, pathname: string): URL {
	const newUrl = new URL(url);
	pathname = pathname.startsWith("/") ? pathname : "/" + pathname;
	pathname = pathname.split("?")[0];
	newUrl.pathname = pathname;
	return newUrl;
}

export async function scrapeListing(
	element: ElementAny | pt.Frame,
	parser: ListingParser,
): Promise<Listing> {
	const listing: { [key: string]: string } = {};
	for (const [key, selector] of Object.entries(parser)) {
		if (selector === undefined || !Array.isArray(selector)) {
			continue;
		}
		if (selector.length === 2) {
			if (Array.isArray(selector[0])) {
				const [selectors, cleanStr] = selector as _SelectorListParser;
				const texts = await Promise.all(
					selectors.map((sel) => getInnerText(element, "::-p-xpath(" + sel + ")")),
				);
				listing[key] = cleanStr(texts);
			} else {
				const [sel, cleanStr] = selector as _SelectorSingleParser;
				const text = await getInnerText(element, "::-p-xpath(" + sel + ")");
				listing[key] = cleanStr(text);
			}
		} else if (selector.length === 3) {
			const [sel, attr, cleanStr] = selector as AttributeExtractor;
			const attrStr = await getAttribute(element, "::-p-xpath(" + sel + ")", attr);
			listing[key] = cleanStr(attrStr);
		}
	}
	return listing as Listing;
}
