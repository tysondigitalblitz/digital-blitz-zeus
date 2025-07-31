// app/api/businesses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

// GET single business
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select(`
        *,
        google_ads_accounts (
          *,
          conversion_actions:google_ads_conversion_actions(*)
        )
      `)
            .eq('id', params.id)
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
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();

        const { data, error } = await supabase
            .from('businesses')
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq('id', params.id)
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