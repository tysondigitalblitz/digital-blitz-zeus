// lib/attribution/matching-engine.ts
import supabase from '@/lib/supabase/server';
import crypto from 'crypto';

export interface OfflinePurchase {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    purchaseAmount: number;
    purchaseDate: Date | string; // Can be either Date object or string
    orderId: string;
}

export interface ExactMatchDetails {
    emailMatch: boolean;
    phoneMatch: boolean;
    locationMatch: boolean;
}

export interface FuzzyMatchDetails {
    locationMatch: boolean;
    timeProximity: number;
    hasEmail: boolean;
    campaignRelevance: boolean;
}

export interface StatisticalMatchDetails {
    location: string;
    totalClicks: number;
    totalConversions: number;
    conversionRate: string;
    attributionProbability: string;
}

export type MatchDetails = ExactMatchDetails | FuzzyMatchDetails | StatisticalMatchDetails;

export interface MatchResult {
    matchType: 'exact' | 'probable' | 'statistical';
    confidence: number; // 0-100
    clickEvent?: Record<string, unknown>;
    gclid?: string;
    attributionMethod: string;
    matchDetails: MatchDetails;
}

export class AttributionEngine {

    // Hash function for comparison
    private hash(value: string): string {
        if (!value) return '';
        return crypto
            .createHash('sha256')
            .update(value.toLowerCase().trim())
            .digest('hex');
    }

    // Normalize phone for matching
    private normalizePhone(phone: string): string {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
    }

    // Main matching function
    async matchPurchase(purchase: OfflinePurchase): Promise<MatchResult> {
        // Try matching methods in order of accuracy

        // 1. Exact Match (Email/Phone)
        const exactMatch = await this.findExactMatch(purchase);
        if (exactMatch) return exactMatch;

        // 2. Fuzzy Match (Partial data)
        const fuzzyMatch = await this.findFuzzyMatch(purchase);
        if (fuzzyMatch) return fuzzyMatch;

        // 3. Statistical Attribution
        const statisticalMatch = await this.statisticalAttribution(purchase);
        return statisticalMatch;
    }

    // Method 1: Exact Match
    private async findExactMatch(purchase: OfflinePurchase): Promise<MatchResult | null> {
        let query = supabase
            .from('click_events')
            .select('*')
            .not('gclid', 'is', null);

        // Build OR conditions for matching
        const conditions = [];

        if (purchase.email) {
            conditions.push(`email.ilike.${purchase.email}`);
        }

        if (purchase.phone) {
            const normalizedPhone = this.normalizePhone(purchase.phone);
            conditions.push(`phone.ilike.%${normalizedPhone}%`);
        }

        if (conditions.length === 0) return null;

        query = query.or(conditions.join(','));

        // Add time window (90 days before purchase)
        const purchaseDate = new Date(purchase.purchaseDate);
        const startDate = new Date(purchaseDate);
        startDate.setDate(startDate.getDate() - 90);
        query = query.lt('timestamp', purchaseDate.toISOString())
            .gt('timestamp', startDate.toISOString());

        // Get most recent match
        const { data, error } = await query
            .order('timestamp', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return null;

        const clickEvent = data[0];

        // Calculate confidence based on match quality
        let confidence = 0;
        const matchDetails = {
            emailMatch: false,
            phoneMatch: false,
            locationMatch: false
        };

        if (purchase.email && clickEvent.email?.toLowerCase() === purchase.email.toLowerCase()) {
            confidence += 50;
            matchDetails.emailMatch = true;
        }

        if (purchase.phone && this.normalizePhone(clickEvent.phone) === this.normalizePhone(purchase.phone)) {
            confidence += 40;
            matchDetails.phoneMatch = true;
        }

        // Location bonus
        if (purchase.city && clickEvent.geo_city?.toLowerCase() === purchase.city.toLowerCase()) {
            confidence += 10;
            matchDetails.locationMatch = true;
        }

        return {
            matchType: 'exact',
            confidence,
            clickEvent,
            gclid: clickEvent.gclid,
            attributionMethod: 'Direct PII Match',
            matchDetails
        };
    }

    // Method 2: Fuzzy Match
    private async findFuzzyMatch(purchase: OfflinePurchase): Promise<MatchResult | null> {
        if (!purchase.city && !purchase.zipCode) return null;

        // Find clicks from same location
        let query = supabase
            .from('click_events')
            .select('*')
            .not('gclid', 'is', null);

        if (purchase.city) {
            query = query.ilike('geo_city', purchase.city);
        }

        if (purchase.zipCode) {
            query = query.eq('geo_postal_code', purchase.zipCode);
        }

        // Time window
        const purchaseDate = new Date(purchase.purchaseDate);
        const startDate = new Date(purchaseDate);
        startDate.setDate(startDate.getDate() - 30); // Narrower window for fuzzy

        const { data, error } = await query
            .lt('timestamp', purchaseDate.toISOString())
            .gt('timestamp', startDate.toISOString())
            .order('timestamp', { ascending: false });

        if (error || !data || data.length === 0) return null;

        // Score each potential match
        const scoredMatches = data.map(event => {
            let score = 0;
            const details = {
                locationMatch: false,
                timeProximity: 0,
                hasEmail: false,
                campaignRelevance: false
            };

            // Location match (base requirement)
            if (purchase.city && event.geo_city?.toLowerCase() === purchase.city.toLowerCase()) {
                score += 30;
                details.locationMatch = true;
            }

            if (purchase.zipCode && event.geo_postal_code === purchase.zipCode) {
                score += 20;
            }

            // Time proximity (more recent = higher score)
            const purchaseDate = new Date(purchase.purchaseDate);
            const eventDate = new Date(event.timestamp);
            const daysBetween = Math.floor(
                (purchaseDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const timeScore = Math.max(0, 30 - daysBetween); // Max 30 points, decreasing by 1 per day
            score += timeScore;
            details.timeProximity = daysBetween;

            // Has contact info (higher quality lead)
            if (event.email || event.phone) {
                score += 10;
                details.hasEmail = true;
            }

            // Campaign relevance (if purchase aligns with campaign)
            if (event.utm_campaign?.includes('purchase') || event.utm_campaign?.includes('sale')) {
                score += 10;
                details.campaignRelevance = true;
            }

            return { event, score, details };
        });

        // Get best match
        const bestMatch = scoredMatches.sort((a, b) => b.score - a.score)[0];

        if (bestMatch.score < 40) return null; // Minimum threshold

        return {
            matchType: 'probable',
            confidence: Math.min(bestMatch.score, 80), // Cap at 80% for fuzzy
            clickEvent: bestMatch.event,
            gclid: bestMatch.event.gclid,
            attributionMethod: 'Location + Time Proximity Match',
            matchDetails: bestMatch.details
        };
    }

    // Method 3: Statistical Attribution
    private async statisticalAttribution(purchase: OfflinePurchase): Promise<MatchResult> {
        // Get location for attribution
        const location = purchase.city || purchase.zipCode || 'unknown';

        // Get click data for location
        const { data: locationStats } = await supabase
            .from('click_events')
            .select('gclid, utm_campaign, utm_source')
            .not('gclid', 'is', null)
            .or(`geo_city.ilike.${location},geo_postal_code.eq.${purchase.zipCode}`)
            .gte('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        // Get conversion rate for location
        const { data: conversionStats } = await supabase
            .from('conversions')
            .select('*')
            .eq('geo_location', location);

        const totalClicks = locationStats?.length || 0;
        const totalConversions = conversionStats?.length || 0;
        const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) : 0.02; // Default 2%

        // Statistical attribution
        const attributionProbability = Math.min(conversionRate * 100, 30); // Cap at 30%

        // Select a click to attribute to (weighted random)
        interface ClickEvent {
            gclid?: string;
            utm_campaign?: string;
            utm_source?: string;
            [key: string]: unknown;
        }

        let selectedClick: ClickEvent | undefined = undefined;
        if (locationStats && locationStats.length > 0) {
            // Weight by recency and campaign type
            const weightedClicks = locationStats.map((click, index) => ({
                ...click,
                weight: locationStats.length - index // More recent = higher weight
            }));

            // Random selection based on weights
            const totalWeight = weightedClicks.reduce((sum, c) => sum + c.weight, 0);
            let random = Math.random() * totalWeight;

            for (const click of weightedClicks) {
                random -= click.weight;
                if (random <= 0) {
                    selectedClick = click;
                    break;
                }
            }
        }

        return {
            matchType: 'statistical',
            confidence: Math.round(attributionProbability),
            clickEvent: selectedClick,
            gclid: selectedClick?.gclid,
            attributionMethod: 'Statistical Location-Based Attribution',
            matchDetails: {
                location,
                totalClicks,
                totalConversions,
                conversionRate: (conversionRate * 100).toFixed(2) + '%',
                attributionProbability: attributionProbability.toFixed(0) + '%'
            }
        };
    }

    // Bulk process purchases
    async bulkMatch(purchases: OfflinePurchase[]): Promise<{
        results: MatchResult[];
        summary: {
            total: number;
            exactMatches: number;
            probableMatches: number;
            statisticalMatches: number;
            noAttribution: number;
            totalValue: number;
            averageConfidence: number;
        };
    }> {
        const results = [];
        const summary = {
            total: purchases.length,
            exactMatches: 0,
            probableMatches: 0,
            statisticalMatches: 0,
            noAttribution: 0,
            totalValue: 0,
            averageConfidence: 0
        };

        for (const purchase of purchases) {
            const result = await this.matchPurchase(purchase);
            results.push(result);

            // Update summary
            summary.totalValue += purchase.purchaseAmount;
            summary.averageConfidence += result.confidence;

            switch (result.matchType) {
                case 'exact':
                    summary.exactMatches++;
                    break;
                case 'probable':
                    summary.probableMatches++;
                    break;
                case 'statistical':
                    summary.statisticalMatches++;
                    break;
            }

            if (result.confidence < 20) {
                summary.noAttribution++;
            }
        }

        summary.averageConfidence = Math.round(summary.averageConfidence / purchases.length);

        return { results, summary };
    }
}