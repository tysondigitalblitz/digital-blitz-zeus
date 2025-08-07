export type GoogleAdsConversionAction = {
    id: string;
    name: string;
    status: string;
    // Add other relevant fields as needed
};

export type GoogleAdsAccount = {
    id: string;
    account_name: string;
    customer_id: string;
    conversion_actions: GoogleAdsConversionAction[];
};

export type Business = {
    id: string;
    name: string;
    description?: string;
    pixel_id?: string;
    google_ads_connected_at?: string;
    google_ads_refresh_token?: string;
    google_ads_accounts?: GoogleAdsAccount[];
};