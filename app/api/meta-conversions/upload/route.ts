import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { MetaConversionsService } from '@/lib/meta-conversions/service';
// import type { ConversionUpload } from '../../../../lib/types/meta-conversions';
import { v4 as uuidv4 } from 'uuid';

const database = supabase;

export async function POST(req: NextRequest) {
    try {
        const { clientId, conversions, uploadType = 'manual' } = await req.json();

        if (!clientId || !conversions || !Array.isArray(conversions)) {
            return NextResponse.json(
                { error: 'Invalid request data' },
                { status: 400 }
            );
        }

        // Get client details
        const { data: client, error: clientError } = await database
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError || !client) {
            return NextResponse.json(
                { error: 'Client not found' },
                { status: 404 }
            );
        }

        // Generate batch ID
        const batchId = `batch_${Date.now()}_${uuidv4().substring(0, 8)}`;

        // Calculate date range
        const eventDates = conversions.map(c => new Date(c.event_time));
        const dateRangeStart = new Date(Math.min(...eventDates.map(d => d.getTime())));
        const dateRangeEnd = new Date(Math.max(...eventDates.map(d => d.getTime())));

        // Create upload batch record
        const { error: batchError } = await supabase
            .from('upload_batches')
            .insert({
                id: batchId,
                client_id: clientId,
                total_events: conversions.length,
                upload_type: uploadType,
                date_range_start: dateRangeStart.toISOString(),
                date_range_end: dateRangeEnd.toISOString()
            });

        if (batchError) {
            console.error('Batch creation error:', batchError);
            return NextResponse.json(
                { error: 'Failed to create batch' },
                { status: 500 }
            );
        }

        // Prepare conversions for database
        const uploadsToInsert = conversions.map(conv => ({
            client_id: clientId,
            batch_id: batchId,
            event_name: conv.event_name,
            event_time: conv.event_time,
            event_id: conv.event_id || `${conv.event_name}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            user_data: conv.user_data,
            custom_data: conv.custom_data,
            event_source_url: conv.event_source_url,
            action_source: conv.action_source || 'website',
            upload_status: 'pending'
        }));

        // Insert conversions
        const { data: insertedConversions, error: insertError } = await supabase
            .from('conversion_uploads')
            .insert(uploadsToInsert)
            .select();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to save conversions' },
                { status: 500 }
            );
        }

        // Send to Meta API
        const metaService = new MetaConversionsService();
        const result = await metaService.processBatchUpload(
            client,
            batchId,
            insertedConversions
        );

        // Update upload status
        if (result.success && result.response) {
            // Mark conversions as uploaded
            await supabase
                .from('conversion_uploads')
                .update({
                    upload_status: 'uploaded',
                    uploaded_at: new Date().toISOString()
                })
                .eq('batch_id', batchId);

            // Store Meta API response
            await supabase
                .from('meta_api_responses')
                .insert({
                    batch_id: batchId,
                    client_id: clientId,
                    events_received: result.response.events_received,
                    events_dropped: result.response.events_dropped,
                    error_count: result.response.error_count,
                    response_data: result.response.response_data,
                    warnings: result.response.warnings,
                    errors: result.response.errors
                });

            // Update batch completion
            await supabase
                .from('upload_batches')
                .update({ completed_at: new Date().toISOString() })
                .eq('id', batchId);

            // Process individual results (if Meta provides them)
            // This would typically be done asynchronously or via webhook
            // For now, we'll create basic results
            const resultsToInsert = insertedConversions.map(conv => ({
                upload_id: conv.id,
                client_id: clientId,
                batch_id: batchId,
                event_id: conv.event_id,
                status: result.response!.events_dropped > 0 ? 'dropped' : 'matched',
                processed_at: new Date().toISOString()
            }));

            await supabase
                .from('conversion_results')
                .insert(resultsToInsert);

        } else {
            // Mark as failed
            await supabase
                .from('conversion_uploads')
                .update({ upload_status: 'failed' })
                .eq('batch_id', batchId);
        }

        return NextResponse.json({
            success: result.success,
            batchId,
            eventsUploaded: conversions.length,
            eventsReceived: result.response?.events_received || 0,
            eventsDropped: result.response?.events_dropped || 0,
            errors: result.errors
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
