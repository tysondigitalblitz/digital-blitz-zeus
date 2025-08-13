// app/api/dashboard/activity/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface ActivityItem {
    id: string;
    type: 'upload' | 'sync' | 'match';
    platform: 'google' | 'meta' | 'system';
    description: string;
    timestamp: string;
    status: 'success' | 'error' | 'pending';
}

export async function GET() {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const activity: ActivityItem[] = [];

        // Get recent Google Ads sync logs
        const { data: googleSyncLogs, error: googleSyncError } = await supabase
            .from('google_ads_sync_log')
            .select(`
                id,
                sync_type,
                status,
                conversions_sent,
                conversions_accepted,
                started_at,
                error_message,
                google_ads_accounts!inner(account_name)
            `)
            .order('started_at', { ascending: false })
            .limit(10);

        if (!googleSyncError && googleSyncLogs) {
            googleSyncLogs.forEach(log => {
                activity.push({
                    id: `google-sync-${log.id}`,
                    type: 'sync',
                    platform: 'google',
                    description: log.status === 'success'
                        ? `Synced ${log.conversions_accepted}/${log.conversions_sent} conversions to ${log.google_ads_accounts?.account_name}`
                        : `Failed to sync conversions to ${log.google_ads_accounts?.account_name}: ${log.error_message}`,
                    timestamp: log.started_at,
                    status: log.status === 'success' ? 'success' : 'error'
                });
            });
        }

        // Get recent Google conversions uploads
        const { data: recentGoogleUploads, error: googleUploadError } = await supabase
            .from('google_conversions')
            .select(`
                id,
                created_at,
                file_name,
                upload_batch_id,
                synced_to_google,
                match_type,
                businesses!inner(name)
            `)
            .order('created_at', { ascending: false })
            .limit(15);

        if (!googleUploadError && recentGoogleUploads) {
            // Group by batch_id to avoid showing individual conversions
            const batches = new Map();

            recentGoogleUploads.forEach(upload => {
                const batchKey = upload.upload_batch_id || upload.created_at;
                if (!batches.has(batchKey)) {
                    batches.set(batchKey, {
                        id: upload.id,
                        created_at: upload.created_at,
                        file_name: upload.file_name,
                        business_name: upload.businesses?.name,
                        count: 0,
                        matched: 0,
                        synced: 0
                    });
                }

                const batch = batches.get(batchKey);
                batch.count++;
                if (upload.match_type) batch.matched++;
                if (upload.synced_to_google) batch.synced++;
            });

            // Convert batches to activity items
            Array.from(batches.values()).slice(0, 5).forEach(batch => {
                activity.push({
                    id: `google-upload-${batch.id}`,
                    type: 'upload',
                    platform: 'google',
                    description: batch.file_name
                        ? `Uploaded ${batch.count} conversions from ${batch.file_name} for ${batch.business_name}`
                        : `Uploaded ${batch.count} conversions for ${batch.business_name}`,
                    timestamp: batch.created_at,
                    status: 'success'
                });

                if (batch.matched > 0) {
                    activity.push({
                        id: `google-match-${batch.id}`,
                        type: 'match',
                        platform: 'google',
                        description: `Matched ${batch.matched}/${batch.count} conversions using click data`,
                        timestamp: batch.created_at,
                        status: 'success'
                    });
                }
            });
        }

        // Get recent Meta conversions uploads (if you have them)
        const { data: recentMetaUploads, error: metaUploadError } = await supabase
            .from('meta_conversions')
            .select(`
                id,
                created_at,
                upload_batch_id,
                synced_to_meta,
                match_type
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!metaUploadError && recentMetaUploads) {
            const metaBatches = new Map();

            recentMetaUploads.forEach(upload => {
                const batchKey = upload.upload_batch_id || upload.created_at;
                if (!metaBatches.has(batchKey)) {
                    metaBatches.set(batchKey, {
                        id: upload.id,
                        created_at: upload.created_at,
                        count: 0,
                        matched: 0,
                        synced: 0
                    });
                }

                const batch = metaBatches.get(batchKey);
                batch.count++;
                if (upload.match_type) batch.matched++;
                if (upload.synced_to_meta) batch.synced++;
            });

            Array.from(metaBatches.values()).slice(0, 3).forEach(batch => {
                activity.push({
                    id: `meta-upload-${batch.id}`,
                    type: 'upload',
                    platform: 'meta',
                    description: `Uploaded ${batch.count} conversions to Meta`,
                    timestamp: batch.created_at,
                    status: 'success'
                });
            });
        }

        // Get recent business connections
        const { data: recentBusinesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, name, google_ads_connected_at')
            .not('google_ads_connected_at', 'is', null)
            .order('google_ads_connected_at', { ascending: false })
            .limit(3);

        if (!businessError && recentBusinesses) {
            recentBusinesses.forEach(business => {
                activity.push({
                    id: `business-connect-${business.id}`,
                    type: 'sync',
                    platform: 'system',
                    description: `Connected ${business.name} to Google Ads`,
                    timestamp: business.google_ads_connected_at!,
                    status: 'success'
                });
            });
        }

        // Sort activity by timestamp (most recent first)
        activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Return the most recent 20 items
        return NextResponse.json(activity.slice(0, 20));

    } catch (error) {
        console.error('Dashboard activity error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard activity' },
            { status: 500 }
        );
    }
}