// app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

// Helper function to get base URL
function getBaseUrl() {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL;
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    return 'http://localhost:3000';
}

// Initialize OAuth2Client
let oauth2Client: OAuth2Client;
try {
    oauth2Client = new OAuth2Client(
        process.env.GOOGLE_ADS_CLIENT_ID,
        process.env.GOOGLE_ADS_CLIENT_SECRET,
        `${getBaseUrl()}/api/auth/google/callback`
    );
} catch (error) {
    console.error('Failed to initialize OAuth2Client:', error);
}

// Initialize Supabase with service key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

export async function GET(req: NextRequest) {
    console.log('OAuth callback initiated');
    const baseUrl = getBaseUrl();

    try {
        // Check if OAuth client is initialized
        if (!oauth2Client) {
            console.error('OAuth2Client not initialized - check environment variables');
            return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?error=oauth_init_failed`);
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('Callback params:', {
            hasCode: !!code,
            hasState: !!state,
            error
        });

        // Handle OAuth errors
        if (error) {
            console.error('OAuth error from Google:', error);
            return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?error=oauth_denied`);
        }

        if (!code) {
            console.error('No authorization code received');
            return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?error=no_code`);
        }

        // Decode state to get businessId
        let businessId: string;
        try {
            const stateData = JSON.parse(Buffer.from(state || '', 'base64').toString());
            businessId = stateData.businessId;
            console.log('Decoded businessId:', businessId);
        } catch (e) {
            console.error('Invalid state parameter:', e);
            return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?error=invalid_state`);
        }

        // Exchange code for tokens
        console.log('Exchanging code for tokens...');
        let tokens;
        try {
            const tokenResponse = await oauth2Client.getToken(code);
            tokens = tokenResponse.tokens;
            console.log('Token exchange successful, has refresh token:', !!tokens.refresh_token);
        } catch (tokenError) {
            console.error('Token exchange failed:', tokenError);
            return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?error=token_exchange_failed`);
        }

        if (!tokens.refresh_token) {
            console.error('No refresh token received. User may need to revoke access and try again.');
            return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?error=no_refresh_token&hint=revoke_access`);
        }

        // Store refresh token in database
        console.log('Updating business with refresh token...');
        const { error: updateError } = await supabase
            .from('businesses')
            .update({
                google_ads_refresh_token: tokens.refresh_token,
                google_ads_connected_at: new Date().toISOString(),
            })
            .eq('id', businessId);

        if (updateError) {
            console.error('Failed to save refresh token:', updateError);
            return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?error=save_failed&details=${encodeURIComponent(updateError.message)}`);
        }

        console.log('Refresh token saved successfully');

        // REMOVED: Automatic account sync - we now use manual account setup
        // The user will manually add Google Ads account details via the UI

        console.log('OAuth flow completed successfully - ready for manual account setup');
        return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?success=google_connected`);

    } catch (error) {
        console.error('OAuth callback error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.redirect(`${baseUrl}/dashboard/google/settings?error=auth_failed&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`);
    }
}