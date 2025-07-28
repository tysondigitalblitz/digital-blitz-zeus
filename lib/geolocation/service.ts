// lib/geolocation/service.ts
import { GeolocationData, IPAPIResponse, IPInfoResponse } from '../types/geolocation';

export class GeolocationService {
    private cache = new Map<string, GeolocationData>();

    // Option 1: Using ipapi.co (Free tier: 1000/day)
    async getLocationFromIPAPI(ip: string): Promise<GeolocationData | null> {
        // Check cache first
        if (this.cache.has(ip)) {
            return this.cache.get(ip)!;
        }

        try {
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            if (!response.ok) return null;

            const data: IPAPIResponse = await response.json();

            const location: GeolocationData = {
                ip: data.ip,
                city: data.city,
                region: data.region,
                region_code: data.region_code,
                country: data.country_name,
                country_code: data.country_code,
                postal_code: data.postal,
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone,
                org: data.org,
                // Additional fields for Google Ads
                metro_code: data.metro_code,
                continent: data.continent_code,
                currency: data.currency
            };

            this.cache.set(ip, location);
            return location;
        } catch (error) {
            console.error('IPAPI error:', error);
            return null;
        }
    }

    // Option 2: Using IPInfo.io (Free tier: 50k/month)
    async getLocationFromIPInfo(ip: string): Promise<GeolocationData | null> {
        const token = process.env.IPINFO_TOKEN;
        if (!token) {
            console.error('IPInfo token not configured');
            return null;
        }

        if (this.cache.has(ip)) {
            return this.cache.get(ip)!;
        }

        try {
            const response = await fetch(`https://ipinfo.io/${ip}?token=${token}`);
            if (!response.ok) return null;

            const data: IPInfoResponse = await response.json();

            // Parse location coordinates
            const [latitude, longitude] = data.loc?.split(',').map(Number) || [null, null];

            const location: GeolocationData = {
                ip: data.ip,
                city: data.city,
                region: data.region,
                region_code: data.region, // IPInfo doesn't provide separate code
                country: data.country,
                country_code: data.country,
                postal_code: data.postal,
                latitude,
                longitude,
                timezone: data.timezone,
                org: data.org,
                // IPInfo specific
                hostname: data.hostname
            };

            this.cache.set(ip, location);
            return location;
        } catch (error) {
            console.error('IPInfo error:', error);
            return null;
        }
    }

    // Option 3: Using MaxMind GeoLite2 (Most accurate, requires signup)
    async getLocationFromMaxMind(ip: string): Promise<GeolocationData | null> {
        const accountId = process.env.MAXMIND_ACCOUNT_ID;
        const licenseKey = process.env.MAXMIND_LICENSE_KEY;

        if (!accountId || !licenseKey) {
            console.error('MaxMind credentials not configured');
            return null;
        }

        if (this.cache.has(ip)) {
            return this.cache.get(ip)!;
        }

        try {
            const auth = Buffer.from(`${accountId}:${licenseKey}`).toString('base64');
            const response = await fetch(`https://geolite.info/geoip/v2.1/city/${ip}`, {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            });

            if (!response.ok) return null;

            const data = await response.json();

            const location: GeolocationData = {
                ip: ip,
                city: data.city?.names?.en,
                region: data.subdivisions?.[0]?.names?.en,
                region_code: data.subdivisions?.[0]?.iso_code,
                country: data.country?.names?.en,
                country_code: data.country?.iso_code,
                postal_code: data.postal?.code,
                latitude: data.location?.latitude,
                longitude: data.location?.longitude,
                timezone: data.location?.time_zone,
                metro_code: data.location?.metro_code,
                continent: data.continent?.code,
                accuracy_radius: data.location?.accuracy_radius
            };

            this.cache.set(ip, location);
            return location;
        } catch (error) {
            console.error('MaxMind error:', error);
            return null;
        }
    }

    // Master function that tries multiple services
    async getLocation(ip: string): Promise<GeolocationData | null> {
        // Skip private/local IPs
        if (this.isPrivateIP(ip)) {
            return null;
        }

        // Try services in order of preference
        let location = null;

        // Try MaxMind first (most accurate)
        if (process.env.MAXMIND_ACCOUNT_ID) {
            location = await this.getLocationFromMaxMind(ip);
            if (location) return location;
        }

        // Try IPInfo (good free tier)
        if (process.env.IPINFO_TOKEN) {
            location = await this.getLocationFromIPInfo(ip);
            if (location) return location;
        }

        // Fallback to IPAPI (no key required)
        location = await this.getLocationFromIPAPI(ip);
        return location;
    }

    // Format location for Google Ads enhanced conversions
    formatForGoogleAds(location: GeolocationData) {
        return {
            address: {
                city: location.city,
                state: location.region_code,
                postal_code: location.postal_code,
                country: location.country_code
            },
            geo: {
                latitude: location.latitude,
                longitude: location.longitude
            },
            additional_data: {
                timezone: location.timezone,
                metro_code: location.metro_code,
                org: location.org
            }
        };
    }

    // Check if IP is private/local
    private isPrivateIP(ip: string): boolean {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;

        const first = parseInt(parts[0]);
        const second = parseInt(parts[1]);

        // Check for private IP ranges
        if (first === 10) return true; // 10.0.0.0/8
        if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12
        if (first === 192 && second === 168) return true; // 192.168.0.0/16
        if (first === 127) return true; // 127.0.0.0/8 (localhost)

        return false;
    }

    // Batch process multiple IPs
    async batchGetLocations(ips: string[]): Promise<Map<string, GeolocationData>> {
        const results = new Map<string, GeolocationData>();

        // Process in batches to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < ips.length; i += batchSize) {
            const batch = ips.slice(i, i + batchSize);
            const promises = batch.map(ip => this.getLocation(ip));
            const locations = await Promise.all(promises);

            batch.forEach((ip, index) => {
                const location = locations[index];
                if (location) {
                    results.set(ip, location);
                }
            });

            // Small delay between batches to respect rate limits
            if (i + batchSize < ips.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }
}