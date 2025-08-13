// app/api/google/debug-conversions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClient } from '@/lib/google-ads/config';

export async function POST(req: NextRequest) {
    try {
        const { customerId, refreshToken } = await req.json();

        if (!customerId || !refreshToken) {
            return NextResponse.json(
                { error: 'Missing customerId or refreshToken' },
                { status: 400 }
            );
        }

        console.log('DEBUG: Testing conversion actions for:', customerId);

        // Try to get conversion actions directly
        const conversionActions = await googleAdsClient.getConversionActions(
            customerId,
            refreshToken
        );

        console.log('DEBUG: Found conversion actions:', conversionActions.length);

        // Log each conversion action
        conversionActions.forEach((action, index) => {
            console.log(`DEBUG: Conversion Action ${index + 1}:`, {
                id: action.id,
                name: action.name,
                type: action.type,
                status: action.status,
                resourceName: action.resourceName
            });
        });

        return NextResponse.json({
            success: true,
            customerId,
            conversionActionsFound: conversionActions.length,
            conversionActions: conversionActions.map(action => ({
                id: action.id,
                name: action.name,
                type: action.type,
                status: action.status,
                resourceName: action.resourceName,
                category: action.category,
                includeInConversionsMetric: action.includeInConversionsMetric
            }))
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('DEBUG: Error fetching conversion actions:', {
            message: error.message,
            code: error.code,
            details: error.details
        });

        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error',
            errorCode: error.code,
            errorDetails: error.details
        }, { status: 500 });
    }
}