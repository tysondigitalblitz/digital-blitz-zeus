// app/api/businesses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const supabase = createRouteHandlerClient({ cookies });

        // First get businesses
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (businessError) {
            console.error('Error fetching businesses:', businessError);
            return NextResponse.json(
                { error: 'Failed to fetch businesses' },
                { status: 500 }
            );
        }

        // For each business, get their Google Ads accounts (if any)
        const businessesWithAccounts = await Promise.all(
            (businesses || []).map(async (business) => {
                const { data: googleAdsAccounts } = await supabase
                    .from('google_ads_accounts')
                    .select(`
                        id,
                        customer_id,
                        account_name,
                        is_active,
                        refresh_token,
                        created_at,
                        conversion_actions:google_ads_conversion_actions(
                            id,
                            conversion_action_id,
                            conversion_action_name,
                            status
                        )
                    `)
                    .eq('business_id', business.id)
                    .eq('is_active', true);

                return {
                    ...business,
                    // Include the business-level OAuth status
                    hasGoogleOAuth: !!business.google_ads_refresh_token,
                    googleOAuthConnectedAt: business.google_ads_connected_at,
                    // Include any configured Google Ads accounts
                    google_ads_accounts: googleAdsAccounts?.map(account => ({
                        ...account,
                        // Use account-level refresh token if available, otherwise business-level
                        hasOAuth: !!(account.refresh_token || business.google_ads_refresh_token),
                        conversion_actions: account.conversion_actions || []
                    })) || []
                };
            })
        );

        return NextResponse.json({
            success: true,
            businesses: businessesWithAccounts
        });

    } catch (error) {
        console.error('Businesses API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { name, description, pixelId } = await req.json();

        if (!name) {
            return NextResponse.json(
                { error: 'Business name is required' },
                { status: 400 }
            );
        }

        const { data: newBusiness, error: insertError } = await supabase
            .from('businesses')
            .insert([
                {
                    name,
                    description: description || null,
                    pixel_id: pixelId || null,
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error('Error creating business:', insertError);
            return NextResponse.json(
                { error: 'Failed to create business' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            business: newBusiness,
            message: 'Business created successfully'
        });

    } catch (error) {
        console.error('Create business error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}