// app/api/google/accounts/unlink-all/route.ts - Fixed version
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function POST() {
    try {
        console.log('Starting unlink all accounts process...');

        // First, get all accounts that are currently linked
        const { data: linkedAccounts, error: fetchError } = await supabase
            .from('google_ads_accounts')
            .select('id, account_name, business_id, businesses(name)')
            .not('business_id', 'is', null);

        if (fetchError) {
            console.error('Error fetching linked accounts:', fetchError);
            return NextResponse.json(
                { error: 'Failed to fetch linked accounts' },
                { status: 500 }
            );
        }

        console.log(`Found ${linkedAccounts?.length || 0} linked accounts to unlink`);

        if (!linkedAccounts || linkedAccounts.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No accounts were linked to unlink',
                unlinkedAccounts: []
            });
        }

        // Since business_id is NOT NULL, we need a different approach
        // Option 1: Delete the accounts entirely (if safe)
        // Option 2: Create a "dummy" business for unlinked accounts
        // Option 3: Make business_id nullable in the database

        // Let's go with Option 2 - Create a dummy business for unlinked accounts

        // First, check if we have a dummy business
        // eslint-disable-next-line prefer-const
        let { data: dummyBusiness, error: dummyError } = await supabase
            .from('businesses')
            .select('id')
            .eq('name', '__UNLINKED_ACCOUNTS__')
            .single();

        if (dummyError && dummyError.code !== 'PGRST116') {
            console.error('Error checking for dummy business:', dummyError);
            return NextResponse.json(
                { error: 'Failed to check for dummy business' },
                { status: 500 }
            );
        }
        console.log('Dummy business found:', dummyBusiness);

        // If no dummy business exists, create one
        if (!dummyBusiness) {
            console.log('Creating dummy business for unlinked accounts...');
            const { data: newDummy, error: createError } = await supabase
                .from('businesses')
                .insert({
                    name: '__UNLINKED_ACCOUNTS__',
                    description: 'Temporary business for unlinked Google Ads accounts',
                    is_active: false,
                    pixel_id: 'unlinked'
                })
                .select('id')
                .single();

            if (createError) {
                console.error('Error creating dummy business:', createError);
                return NextResponse.json(
                    { error: 'Failed to create dummy business for unlinking' },
                    { status: 500 }
                );
            }
            dummyBusiness = newDummy;
        }

        console.log(`Using dummy business ID: ${dummyBusiness.id}`);

        // Now "unlink" accounts by moving them to the dummy business
        const { data: unlinkedAccounts, error: unlinkError } = await supabase
            .from('google_ads_accounts')
            .update({
                business_id: dummyBusiness.id,
                updated_at: new Date().toISOString()
            })
            .not('business_id', 'is', null)
            .neq('business_id', dummyBusiness.id) // Don't update accounts already in dummy business
            .select('id, account_name, customer_id');

        if (unlinkError) {
            console.error('Error unlinking accounts:', unlinkError);
            return NextResponse.json(
                { error: 'Failed to unlink accounts', details: unlinkError.message },
                { status: 500 }
            );
        }

        console.log(`Successfully unlinked ${unlinkedAccounts?.length || 0} accounts`);

        return NextResponse.json({
            success: true,
            message: `Successfully unlinked ${unlinkedAccounts?.length || 0} accounts`,
            unlinkedAccounts: unlinkedAccounts || [],
            dummyBusinessId: dummyBusiness.id
        });

    } catch (error) {
        console.error('Unlink all accounts error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}