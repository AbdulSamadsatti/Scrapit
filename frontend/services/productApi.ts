import { getBaseUrl } from "@/utils/getBaseUrl";

export interface Product {
    id?: string;
    title: string;
    price?: string;
    price_amount?: number | null;
    currency?: string;
    image_url?: string;
    image?: string;
    product_url?: string;
    description?: string;
    rating?: string;
    review_count?: string;
    seller_name?: string;
    availability?: string;
    location?: string;
    category?: string;
    brand?: string;
    source?: string;
    source_label?: string;
    created_at?: string;
    last_seen_at?: string;
}

export interface GetProductsOptions {
    forceRefresh?: boolean;
    shuffle?: boolean;
    refreshToken?: string;
}

export const getProducts = async (
    query: string,
    maxProducts: number = 40,
    options: GetProductsOptions = {}
): Promise<Product[]> => {
    const { forceRefresh = false, shuffle = false, refreshToken } = options;
    const base = getBaseUrl();
    let url =
        `${base}/api/ecommerce/products` +
        `?q=${encodeURIComponent(query)}` +
        `&max_products=${maxProducts}`;
    if (forceRefresh) {
        url += `&shuffle=true&refresh_token=${Date.now()}`;
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
    return data.products ?? [];
};

export const getProductDetail = async (product: Product): Promise<Product> => {
    const base = getBaseUrl();
    const id = product.id ? `product_id=${encodeURIComponent(product.id)}` : "";
    const source = product.source ? `source=${encodeURIComponent(product.source)}` : "";
    const url = product.product_url ? `url=${encodeURIComponent(product.product_url)}` : "";
    const query = id || [source, url].filter(Boolean).join("&");
    const response = await fetch(`${base}/api/ecommerce/products/detail?${query}`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.product ?? product;
};