import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { AttributionEngine, OfflinePurchase } from '@/lib/attribution/matching-engine';
import Papa from 'papaparse';
export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type');
        let conversions = [];
        let fileName: string | null = null;
        // Handle CSV upload
        if (contentType?.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File;

            if (!file) {
                return NextResponse.json(
                    { error: 'No file provided' },
                    { status: 400 }
                );
            }

            fileName = file.name;
            const csvText = await file.text();
            const { data, errors } = Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_')
            });

            if (errors.length > 0) {
                return NextResponse.json(
                    { error: 'CSV parsing errors', errors },
                    { status: 400 }
                );
            }

            // Transform CSV data to conversion format
            conversions = data.map((row: any) => ({
                email: row.email || row.email_address || '',
                phone: row.phone || row.phone_number || '',
                firstName: row.first_name || row.firstname || '',
                lastName: row.last_name || row.lastname || '',
                city: row.city || '',
                state: row.state || '',
                zipCode: row.zip_code || row.zip || row.postal_code || '',
                purchaseAmount: parseFloat(row.purchase_amount || row.amount || row.total || 0),
                purchaseDate: row.purchase_date || row.date || new Date().toISOString(),
                orderId: row.order_id || row.id || `GOOGLE-${Date.now()}-${Math.random().toString(36).substring(7)}`
            }));
        }
        // Handle JSON upload
        else {
            const body = await req.json();
            conversions = body.conversions || [];
        }

        if (conversions.length === 0) {
            return NextResponse.json(
                { error: 'No conversions provided' },
                { status: 400 }
            );
        }

        // Validate conversions
        const validConversions = conversions.filter(conv => {
            return (conv.email || conv.phone) && conv.purchaseAmount > 0;
        });

        if (validConversions.length === 0) {
            return NextResponse.json(
                { error: 'No valid conversions found. Each conversion must have email or phone and a purchase amount.' },
                { status: 400 }
            );
        }

        // Generate batch ID
        const batchId = `GOOGLE-BATCH-${Date.now()}`;

        // Save conversions to Google-specific table
        const insertData = validConversions.map(conv => ({
            email: conv.email || null,
            phone: conv.phone || null,
            first_name: conv.firstName || null,
            last_name: conv.lastName || null,
            city: conv.city || null,
            state: conv.state || null,
            zip_code: conv.zipCode || null,
            purchase_amount: conv.purchaseAmount,
            purchase_date: conv.purchaseDate,
            order_id: conv.orderId,
            upload_batch_id: batchId,
            file_name: fileName,
            processed: false
        }));

        const { data: insertedConversions, error: insertError } = await supabase
            .from('google_conversions')
            .insert(insertData)
            .select();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to save conversions', details: insertError.message },
                { status: 500 }
            );
        }

        // Process matching for each conversion
        const engine = new AttributionEngine();
        const matchingResults = {
            results: [] as any[],
            summary: {
                exactMatches: 0,
                probableMatches: 0,
                statisticalMatches: 0,
                noMatches: 0,
                totalConfidence: 0
            }
        };

        // Process each conversion individually
        for (let i = 0; i < insertedConversions.length; i++) {
            const conversion = insertedConversions[i];
            const purchase: OfflinePurchase = {
                email: conversion.email,
                phone: conversion.phone,
                firstName: conversion.first_name,
                lastName: conversion.last_name,
                city: conversion.city,
                state: conversion.state,
                zipCode: conversion.zip_code,
                purchaseAmount: conversion.purchase_amount,
                purchaseDate: conversion.purchase_date,
                orderId: conversion.order_id
            };

            try {
                const matchResult = await engine.matchPurchase(purchase);
                matchingResults.results.push(matchResult);

                // Update summary
                if (matchResult.matchType === 'exact') {
                    matchingResults.summary.exactMatches++;
                } else if (matchResult.matchType === 'probable') {
                    matchingResults.summary.probableMatches++;
                } else if (matchResult.matchType === 'statistical') {
                    matchingResults.summary.statisticalMatches++;
                } else {
                    matchingResults.summary.noMatches++;
                }
                matchingResults.summary.totalConfidence += matchResult.confidence;

                // Update conversion with matching results
                if (matchResult && matchResult.confidence > 0) {
                    await supabase
                        .from('google_conversions')
                        .update({
                            matched_click_event_id: matchResult.clickEvent?.id,
                            matched_gclid: matchResult.gclid,
                            match_type: matchResult.matchType,
                            match_confidence: matchResult.confidence,
                            attribution_method: matchResult.attributionMethod,
                            match_details: matchResult.matchDetails,
                            processed: true,
                            processed_at: new Date().toISOString()
                        })
                        .eq('id', conversion.id);
                } else {
                    // Mark as processed even if no match
                    await supabase
                        .from('google_conversions')
                        .update({
                            processed: true,
                            processed_at: new Date().toISOString(),
                            match_type: 'none',
                            match_confidence: 0
                        })
                        .eq('id', conversion.id);
                }
            } catch (error) {
                console.error(`Error matching conversion ${conversion.order_id}:`, error);
                matchingResults.results.push({
                    orderId: conversion.order_id,
                    error: 'Failed to process'
                });
            }
        }

        // Calculate average confidence
        const averageConfidence = matchingResults.summary.totalConfidence > 0
            ? Math.round(matchingResults.summary.totalConfidence / validConversions.length)
            : 0;

        // Prepare detailed results for the response
        const details = matchingResults.results.map((result, index) => ({
            orderId: validConversions[index].orderId,
            email: validConversions[index].email,
            matchType: result.matchType || 'none',
            confidence: result.confidence || 0,
            matchedGclid: result.gclid,
            error: result.error
        }));

        return NextResponse.json({
            success: true,
            uploaded: conversions.length,
            processed: validConversions.length,
            matched: matchingResults.results.filter(r => r.confidence > 0).length,
            batchId,
            summary: {
                ...matchingResults.summary,
                averageConfidence
            },
            details: details.slice(0, 10) // Return first 10 for UI display
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process conversions',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
// GET endpoint to check Google conversion status
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');
        let query = supabase
            .from('google_conversions')
            .select('*');

        if (batchId) {
            query = query.eq('upload_batch_id', batchId);
        } else {
            query = query.order('created_at', { ascending: false }).limit(100);
        }

        const { data, error } = await query;

        if (error) throw error;

        const summary = {
            total: data?.length || 0,
            processed: data?.filter(c => c.processed).length || 0,
            matched: data?.filter(c => c.matched_gclid).length || 0,
            syncedToGoogle: data?.filter(c => c.synced_to_google).length || 0
        };

        return NextResponse.json({
            conversions: data,
            summary
        });

    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversions' },
            { status: 500 }
        );
    }
}