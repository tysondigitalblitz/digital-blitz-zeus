import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function GET() {
    try {
        // Top locations by traffic
        const { data: topLocations } = await supabase
            .from('click_events')
            .select('geo_city, geo_region')
            .not('geo_city', 'is', null)
            .not('gclid', 'is', null);

        // Count by location
        const locationCounts: { [key: string]: number } = {};
        topLocations?.forEach(loc => {
            const key = `${loc.geo_city}, ${loc.geo_region}`;
            locationCounts[key] = (locationCounts[key] || 0) + 1;
        });

        const topLocationsList = Object.entries(locationCounts)
            .map(([location, count]) => {
                const [city, state] = location.split(', ');
                return { city, state, clicks: count };
            })
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);

        // Conversion rates by location
        const { data: conversions } = await supabase
            .from('click_events')
            .select('geo_city, email, phone')
            .not('geo_city', 'is', null)
            .or('email.not.is.null,phone.not.is.null');

        const conversionsByCity: { [key: string]: number } = {};
        const clicksByCity: { [key: string]: number } = {};

        topLocations?.forEach(event => {
            clicksByCity[event.geo_city] = (clicksByCity[event.geo_city] || 0) + 1;
        });

        conversions?.forEach(event => {
            conversionsByCity[event.geo_city] = (conversionsByCity[event.geo_city] || 0) + 1;
        });

        const conversionRates = Object.keys(clicksByCity)
            .map(city => ({
                city,
                clicks: clicksByCity[city],
                conversions: conversionsByCity[city] || 0,
                rate: Math.round(((conversionsByCity[city] || 0) / clicksByCity[city]) * 100)
            }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 10);

        // Attribution potential
        const { count: unmatchedPurchases } = await supabase
            .from('conversions')
            .select('*', { count: 'exact', head: true })
            .is('matched_gclid', null);

        // Recommendations
        const recommendations = {
            topCity: topLocationsList[0]?.city,
            lowConversionCity: conversionRates.find(c => c.clicks > 50 && c.rate < 5)?.city,
            highValueCity: conversionRates[0]?.city
        };

        return NextResponse.json({
            topLocations: topLocationsList,
            conversionRates,
            attributionPotential: {
                totalUnmatched: unmatchedPurchases || 0
            },
            recommendations
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}