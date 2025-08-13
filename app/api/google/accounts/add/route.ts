// app/api/google/accounts/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const {
            business_id,
            customer_id,
            account_name,
            conversion_action_id,
            conversion_action_name
        } = await req.json();

        // Validate required fields
        if (!business_id || !customer_id || !conversion_action_id) {
            return NextResponse.json(
                { error: 'Missing required fields: business_id, customer_id, conversion_action_id' },
                { status: 400 }
            );
        }

        // Validate customer ID format (should be xxx-xxx-xxxx)
        const customerIdRegex = /^\d{3}-\d{3}-\d{4}$/;
        if (!customerIdRegex.test(customer_id)) {
            return NextResponse.json(
                { error: 'Customer ID must be in format: 123-456-7890' },
                { status: 400 }
            );
        }

        // Check if customer_id already exists
        const { data: existingAccount } = await supabase
            .from('google_ads_accounts')
            .select('id')
            .eq('customer_id', customer_id)
            .single();

        if (existingAccount) {
            return NextResponse.json(
                { error: 'Google Ads account with this Customer ID already exists' },
                { status: 409 }
            );
        }

        // Insert the new account
        const { data: newAccount, error: insertError } = await supabase
            .from('google_ads_accounts')
            .insert([
                {
                    business_id,
                    customer_id,
                    account_name: account_name || `Google Ads ${customer_id}`,
                    account_type: 'standard',
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting Google Ads account:', insertError);
            return NextResponse.json(
                { error: 'Failed to create Google Ads account' },
                { status: 500 }
            );
        }

        // Insert the conversion action
        const { error: conversionError } = await supabase
            .from('google_ads_conversion_actions')
            .insert([
                {
                    account_id: newAccount.id,
                    conversion_action_id,
                    conversion_action_name: conversion_action_name || 'Enhanced Conversion',
                    conversion_type: 'WEBPAGE',
                    status: 'ENABLED',
                    is_enhanced_conversions_enabled: true
                }
            ]);

        if (conversionError) {
            console.error('Error inserting conversion action:', conversionError);
            // Don't fail the whole request, just log the error
        }

        return NextResponse.json({
            success: true,
            account: newAccount,
            message: 'Google Ads account added successfully'
        });

    } catch (error) {
        console.error('Add Google Ads account error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}