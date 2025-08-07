// app/api/google/verify-connection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import supabase from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { businessId } = await req.json();

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Get the refresh token for this business
        const { data: business, error } = await supabase
            .from('businesses')
            .select('name, google_ads_refresh_token')
            .eq('id', businessId)
            .single();

        if (error || !business?.google_ads_refresh_token) {
            return NextResponse.json({ error: 'Business not connected to Google Ads' }, { status: 400 });
        }

        // Initialize OAuth2 client
        const oauth2Client = new OAuth2Client(
            process.env.GOOGLE_ADS_CLIENT_ID,
            process.env.GOOGLE_ADS_CLIENT_SECRET,
            'http://localhost:3000/api/auth/google/callback'
        );

        // Set the refresh token
        oauth2Client.setCredentials({
            refresh_token: business.google_ads_refresh_token,
        });

        try {
            // Get token info to verify the connection
            const tokenInfo = await oauth2Client.getTokenInfo(
                (await oauth2Client.getAccessToken()).token!
            );

            // Get user info if possible
            const ticket = await oauth2Client.verifyIdToken({
                idToken: (await oauth2Client.getAccessToken()).token!,
                audience: process.env.GOOGLE_ADS_CLIENT_ID!,
            }).catch(() => null);

            return NextResponse.json({
                success: true,
                business: business.name,
                googleAccount: {
                    email: tokenInfo.email || 'Could not retrieve email',
                    scopes: tokenInfo.scopes,
                    expiryDate: tokenInfo.expiry_date,
                },
                message: `Business "${business.name}" is connected to Google account: ${ticket?.getPayload()?.email || 'Unknown'}`,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (tokenError: any) {
            console.error('Token verification failed:', tokenError);
            return NextResponse.json({
                success: false,
                business: business.name,
                message: `Failed to verify Google account connection: ${tokenError.message}`,
            });
        }
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { error: 'Failed to verify connection' },
            { status: 500 }
        );
    }
}