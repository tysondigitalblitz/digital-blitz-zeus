// app/api/businesses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

// GET single business
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }  // Fixed: params is now a Promise
) {
    try {
        const { id } = await context.params;  // Fixed: await the params

        const { data, error } = await supabase
            .from('businesses')
            .select(`
        *,
        google_ads_accounts (
          *,
          conversion_actions:google_ads_conversion_actions(*)
        )
      `)
            .eq('id', id)  // Use the awaited id
            .single();

        if (error) throw error;

        return NextResponse.json({
            business: data,
        });
    } catch (error) {
        console.error('Error fetching business:', error);
        return NextResponse.json(
            { error: 'Business not found' },
            { status: 404 }
        );
    }
}

// PATCH update business
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }  // Fixed: params is now a Promise
) {
    try {
        const { id } = await context.params;  // Fixed: await the params
        const body = await req.json();

        const { data, error } = await supabase
            .from('businesses')
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)  // Use the awaited id
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            business: data,
        });
    } catch (error) {
        console.error('Error updating business:', error);
        return NextResponse.json(
            { error: 'Failed to update business' },
            { status: 500 }
        );
    }
}

// DELETE business
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }  // Fixed: params is now a Promise
) {
    try {
        const { id } = await context.params;  // Fixed: await the params

        // Check if business exists
        const { data: business, error: checkError } = await supabase
            .from('businesses')
            .select('id, name')
            .eq('id', id)  // Use the awaited id
            .single();

        if (checkError || !business) {
            return NextResponse.json(
                { error: 'Business not found' },
                { status: 404 }
            );
        }

        // Delete related data first (due to foreign key constraints)

        // 1. Delete Google Ads conversion actions
        const { data: googleAccounts } = await supabase
            .from('google_ads_accounts')
            .select('id')
            .eq('business_id', id);  // Use the awaited id

        if (googleAccounts && googleAccounts.length > 0) {
            const accountIds = googleAccounts.map(acc => acc.id);

            // Delete conversion actions
            await supabase
                .from('google_ads_conversion_actions')
                .delete()
                .in('account_id', accountIds);

            // Delete sync logs
            await supabase
                .from('google_ads_sync_log')
                .delete()
                .in('account_id', accountIds);
        }

        // 2. Delete Google Ads accounts
        await supabase
            .from('google_ads_accounts')
            .delete()
            .eq('business_id', id);  // Use the awaited id

        // 3. Delete Google conversions
        await supabase
            .from('google_conversions')
            .delete()
            .eq('business_id', id);  // Use the awaited id

        // 4. Delete Meta conversions (if any)
        await supabase
            .from('meta_conversions')
            .delete()
            .eq('business_id', id);  // Use the awaited id

        // 5. Finally delete the business
        const { error: deleteError } = await supabase
            .from('businesses')
            .delete()
            .eq('id', id);  // Use the awaited id

        if (deleteError) {
            console.error('Error deleting business:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete business' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Business "${business.name}" deleted successfully`
        });

    } catch (error) {
        console.error('Delete business error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}