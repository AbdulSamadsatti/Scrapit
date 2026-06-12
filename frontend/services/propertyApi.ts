// frontend/services/propertyApi.ts
import { getBaseUrl } from "@/utils/getBaseUrl";

export interface Property {
    id?: string;
    title: string;
    price?: string;
    price_amount?: number | null;
    currency?: string;
    location?: string;
    beds?: string;
    baths?: string;
    area?: string;
    purpose?: string;          // sale | rent
    property_type?: string;    // house | flat | plot | commercial ...
    image_url?: string;
    image?: string;            // alias
    listing_url?: string;
    description?: string;
    agent_name?: string;
    posted_at?: string;
    source?: string;
    source_label?: string;
}

export interface GetPropertyOptions {
    forceRefresh?: boolean;
    shuffle?: boolean;
    refreshToken?: string;
}

export const getProperties = async (
    query: string,
    maxListings: number = 40,
    options: GetPropertyOptions = {}
): Promise<Property[]> => {
    const { forceRefresh = false, shuffle = false, refreshToken } = options;
    const base = getBaseUrl();
    let url =
        `${base}/api/property` +
        `?q=${encodeURIComponent(query)}` +
        `&max_listings=${maxListings}`;
    if (forceRefresh) {
        url += `&force_scrape=true&shuffle=true&refresh_token=${Date.now()}`;
    } else {
        if (shuffle) {
            url += "&shuffle=true";
        }
        if (refreshToken) {
            url += `&refresh_token=${encodeURIComponent(refreshToken)}`;
        }
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    // API returns { status, total_results, listings }
    return data.listings ?? [];
};

export const getPropertyDetail = async (property: Property): Promise<Property> => {
    const base = getBaseUrl();
    const source = property.source ? `source=${encodeURIComponent(property.source)}` : "";
    const url = property.listing_url ? `url=${encodeURIComponent(property.listing_url)}` : "";
    const query = [source, url].filter(Boolean).join("&");
    const response = await fetch(`${base}/api/property/detail?${query}`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.listing ?? property;
};