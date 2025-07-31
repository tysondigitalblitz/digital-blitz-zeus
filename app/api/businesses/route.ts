// app/api/businesses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

// GET all businesses with their Google Ads accounts
export async function GET() {
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
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            businesses: data || [],
        });
    } catch (error) {
        console.error('Error fetching businesses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch businesses' },
            { status: 500 }
        );
    }
}

// POST create new business
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, pixelId } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Business name is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('businesses')
            .insert({
                name,
                description,
                pixel_id: pixelId,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            business: data,
        });
    } catch (error) {
        console.error('Error creating business:', error);
        return NextResponse.json(
            { error: 'Failed to create business' },
            { status: 500 }
        );
    }
}
