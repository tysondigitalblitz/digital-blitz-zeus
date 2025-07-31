import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import supabase from '@/lib/supabase/server';

const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
    process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/google/callback'
        : 'http://localhost:3000/api/auth/google/callback'
);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
            return NextResponse.redirect('/settings?error=no_code');
        }

        // Decode state to get businessId
        const stateData = JSON.parse(Buffer.from(state || '', 'base64').toString());
        const { businessId } = stateData;

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            return NextResponse.redirect('/settings?error=no_refresh_token');
        }

        // Store refresh token in database
        // You might want to encrypt this before storing
        await supabase
            .from('businesses')
            .update({
                google_ads_refresh_token: tokens.refresh_token,
                google_ads_connected_at: new Date().toISOString(),
            })
            .eq('id', businessId);

        // Trigger account sync
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/google/accounts/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refreshToken: tokens.refresh_token,
                businessId,
            }),
        });

        if (syncResponse.ok) {
            return NextResponse.redirect('/settings?success=google_connected');
        } else {
            return NextResponse.redirect('/settings?error=sync_failed');
        }

    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect('/settings?error=auth_failed');
    }
}