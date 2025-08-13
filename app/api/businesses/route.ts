// app/api/businesses/route.ts - Fixed to properly include linked Google Ads accounts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function GET() {
    try {
        // First, get all businesses
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (businessError) {
            console.error('Error fetching businesses:', businessError);
            return NextResponse.json(
                { error: 'Failed to fetch businesses' },
                { status: 500 }
            );
        }

        // Then, for each business, get its linked Google Ads accounts
        const businessesWithAccounts = await Promise.all(
            businesses.map(async (business) => {
                // Get accounts linked to this business (excluding dummy business)
                const { data: accounts, error: accountError } = await supabase
                    .from('google_ads_accounts')
                    .select(`
                        id,
                        customer_id,
                        account_name,
                        account_type,
                        is_active,
                        google_ads_conversion_actions (
                            id,
                            conversion_action_id,
                            conversion_action_name,
                            conversion_type,
                            status,
                            is_enhanced_conversions_enabled
                        )
                    `)
                    .eq('business_id', business.id)
                    .neq('account_name', '__UNLINKED_ACCOUNTS__'); // Exclude dummy accounts

                if (accountError) {
                    console.error(`Error fetching accounts for business ${business.id}:`, accountError);
                }

                return {
                    id: business.id,
                    name: business.name,
                    description: business.description,
                    pixel_id: business.pixel_id,
                    google_ads_refresh_token: business.google_ads_refresh_token,
                    google_ads_connected_at: business.google_ads_connected_at,
                    hasGoogleOAuth: !!business.google_ads_refresh_token,
                    googleOAuthConnectedAt: business.google_ads_connected_at,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    google_ads_accounts: accounts?.map((account: any) => ({
                        id: account.id,
                        customer_id: account.customer_id,
                        account_name: account.account_name,
                        account_type: account.account_type,
                        is_active: account.is_active,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        conversion_actions: account.google_ads_conversion_actions?.map((action: any) => ({
                            id: action.id,
                            conversion_action_id: action.conversion_action_id,
                            conversion_action_name: action.conversion_action_name,
                            conversion_type: action.conversion_type,
                            status: action.status,
                            is_enhanced_conversions_enabled: action.is_enhanced_conversions_enabled
                        })) || []
                    })) || []
                };
            })
        );

        console.log(`Found ${businessesWithAccounts.length} businesses with their linked accounts`);

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
        const { name, description } = await req.json();

        if (!name) {
            return NextResponse.json(
                { error: 'Business name is required' },
                { status: 400 }
            );
        }

        const { data: business, error } = await supabase
            .from('businesses')
            .insert({
                name,
                description,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating business:', error);
            return NextResponse.json(
                { error: 'Failed to create business' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            business
        });

    } catch (error) {
        console.error('Business creation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}