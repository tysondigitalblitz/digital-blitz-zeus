// app/api/auth/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
    process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com/api/auth/google/callback'
        : 'http://localhost:3000/api/auth/google/callback'
);

// Generate auth URL
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    // Store businessId in state parameter to retrieve after auth
    const state = Buffer.from(JSON.stringify({
        businessId,
        timestamp: Date.now()
    })).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/adwords',
        ],
        prompt: 'consent', // Force consent to ensure we get refresh token
        state,
    });

    return NextResponse.redirect(authUrl);
}
