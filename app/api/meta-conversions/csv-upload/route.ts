import { ConversionUpload } from '@/lib/types/meta-conversions';
import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { CsvRow } from '@/lib/types/meta-conversions';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const clientId = formData.get('clientId') as string;

        if (!file || !clientId) {
            return NextResponse.json(
                { error: 'File and clientId are required' },
                { status: 400 }
            );
        }

        const csvContent = await file.text();

        // Parse CSV
        const { data, errors } = Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });

        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'CSV parsing errors', errors },
                { status: 400 }
            );
        }

        // Transform CSV rows to ConversionUpload format
        const conversions: ConversionUpload[] = (data as CsvRow[]).map((row: CsvRow) => ({
            client_id: clientId,
            batch_id: '', // Will be set in upload route
            event_name: row.event_name,
            event_time: row.event_time,
            event_id: row.event_id || `${row.event_name}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            user_data: {
                email: row.email,
                phone: row.phone,
                firstName: row.first_name,
                lastName: row.last_name,
                city: row.city,
                state: row.state,
                zipCode: row.zip,
                country: row.country
            },
            custom_data: {
                value: parseFloat(row.value as string) || undefined,
                currency: row.currency || 'USD',
                content_ids: row.content_ids?.split(',').map((id: string) => id.trim()),
                content_name: row.content_name,
                order_id: row.order_id
            },
            event_source_url: row.event_source_url,
            action_source: (['website', 'app', 'offline', 'other'].includes(row.action_source as string)
                ? row.action_source
                : 'website') as 'website' | 'app' | 'offline' | 'other'
        }));

        // Call the main upload endpoint
        const uploadResponse = await fetch(new URL('/api/meta-conversions/upload', req.url).toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clientId,
                conversions,
                uploadType: 'csv'
            })
        });

        const result = await uploadResponse.json();

        return NextResponse.json(result, { status: uploadResponse.status });

    } catch (error) {
        console.error('CSV upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process CSV file' },
            { status: 500 }
        );
    }
}