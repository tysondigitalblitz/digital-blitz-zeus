import { NextRequest, NextResponse } from 'next/server';
import { AttributionEngine } from '@/lib/attribution/matching-engine';

export async function POST(req: NextRequest) {
    try {
        const { purchase, purchases } = await req.json();

        const engine = new AttributionEngine();

        if (purchase) {
            // Single purchase match
            const result = await engine.matchPurchase(purchase);
            return NextResponse.json(result);
        } else if (purchases) {
            // Bulk match
            const results = await engine.bulkMatch(purchases);
            return NextResponse.json(results);
        } else {
            return NextResponse.json(
                { error: 'No purchase data provided' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Attribution error:', error);
        return NextResponse.json(
            { error: 'Attribution matching failed' },
            { status: 500 }
        );
    }
}