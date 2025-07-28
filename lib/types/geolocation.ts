// types/geolocation.ts

export interface GeolocationData {
    ip: string;
    city?: string;
    region?: string;
    region_code?: string;
    country?: string;
    country_code?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    org?: string;
    metro_code?: number;
    continent?: string;
    currency?: string;
    hostname?: string;
    accuracy_radius?: number;
}

export interface IPAPIResponse {
    ip: string;
    city: string;
    region: string;
    region_code: string;
    country: string;
    country_name: string;
    country_code: string;
    country_code_iso3: string;
    country_capital: string;
    country_tld: string;
    continent_code: string;
    in_eu: boolean;
    postal: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utc_offset: string;
    country_calling_code: string;
    currency: string;
    currency_name: string;
    languages: string;
    country_area: number;
    country_population: number;
    asn: string;
    org: string;
    metro_code?: number;
}

export interface IPInfoResponse {
    ip: string;
    hostname?: string;
    city: string;
    region: string;
    country: string;
    loc: string;
    org: string;
    postal: string;
    timezone: string;
}

export interface EnhancedClickEvent {
    id: string;
    client_id: string;
    gclid?: string;
    email?: string;
    phone?: string;
    ip_address: string;
    timestamp: string;
    // Platform and user data
    platform?: string;
    user_agent?: string;
    // Session data
    session_id?: string;
    time_on_site?: number;
    pages_viewed?: number;
    landing_page?: string;
    // Geolocation data
    geo_city?: string;
    geo_region?: string;
    geo_country?: string;
    geo_postal_code?: string;
    geo_latitude?: number;
    geo_longitude?: number;
    geo_metro_code?: number;
    geo_timezone?: string;
    geo_org?: string;
    geo_processed?: boolean;
    geo_processed_at?: string;
    // UTM parameters
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    // Additional tracking
    page_url?: string;
    page_title?: string;
    referrer?: string;
}