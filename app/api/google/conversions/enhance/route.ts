// app/api/google/conversions/enhance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import supabase from '@/lib/supabase/server';
import { googleAdsClient } from '@/lib/google-ads/config';

interface Record {
    purchase_date?: string;
    date?: string;
    Date?: string;
    DATE?: string;
    timestamp?: string;
    email?: string;
    Email?: string;
    EMAIL?: string;
    phone?: string;
    Phone?: string;
    PHONE?: string;
    phone_number?: string;
    purchase_amount?: string;
    amount?: string;
    value?: string;
    first_name?: string;
    firstName?: string;
    last_name?: string;
    lastName?: string;
    address?: string;
    street?: string;
    city?: string;
    state?: string;
    region?: string;
    zip?: string;
    zip_code?: string;
    postal_code?: string;
    country?: string;
    order_id?: string;
    orderId?: string;
    id?: string;
    matched_gclid?: string;
}

interface MatchResult {
    gclid?: string | null;
    match_type: string;
    match_confidence: number;
    click_event_id?: string;
    matched_field?: string;
    google_lead_id?: string;
    campaign_id?: string;
    ad_group_id?: string;
    submission_date?: string;
}

// Normalization functions
function normalizeEmail(email: string | null): string | null {
    if (!email) return null;
    email = email.toLowerCase().trim();
    if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {
        const [localPart, domain] = email.split('@');
        email = localPart.replace(/\./g, '') + '@' + domain;
    }
    return email;
}

function normalizePhone(phone: string | null): string | null {
    if (!phone) return null;
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) {
        phone = '1' + phone;
    } else if (phone.length !== 11) {
        return null; // Invalid phone
    }
    return '+' + phone;
}

// Matching engine
// app/api/google/conversions/enhance/route.ts (corrected matching function)

async function findClickEventMatch(
    email: string | null,
    phone: string | null,
    purchaseDate: Date,
    businessId: string  // Changed from clientId
): Promise<MatchResult | null> {
    try {
        // First, get the pixel_id for this business
        const { data: business } = await supabase
            .from('businesses')
            .select('pixel_id')
            .eq('id', businessId)
            .single();

        if (!business?.pixel_id) {
            console.log('No pixel_id found for business:', businessId);
            return null;
        }

        // Build dynamic query based on available data
        const query = supabase
            .from('click_events')
            .select('*')
            .eq('client_id', business.pixel_id);  // Match pixel_id to client_id

        // Try to match by normalized email or phone
        const conditions = [];
        if (email) conditions.push(`normalized_email.eq.${email}`);
        if (phone) conditions.push(`normalized_phone.eq.${phone}`);

        if (conditions.length === 0) return null;

        // Find events within 90 days before purchase
        const minDate = new Date(purchaseDate);
        minDate.setDate(minDate.getDate() - 90);

        const { data: clickEvents } = await query
            .or(conditions.join(','))
            .gte('timestamp', minDate.toISOString())
            .lte('timestamp', purchaseDate.toISOString())
            .order('timestamp', { ascending: false });

        if (!clickEvents || clickEvents.length === 0) return null;

        // Prioritize events with GCLID
        const withGclid = clickEvents.find(e => e.gclid && (!e.gclid_expires_at || new Date(e.gclid_expires_at) > new Date()));
        if (withGclid) {
            return {
                gclid: withGclid.gclid,
                match_type: 'gclid_match',
                match_confidence: 100,
                click_event_id: withGclid.id,
                matched_field: email && withGclid.normalized_email === email ? 'email' : 'phone'
            };
        }

        // Return best match even without GCLID (for enhanced conversions)
        const bestMatch = clickEvents[0];
        return {
            gclid: null,
            match_type: 'enhanced_only',
            match_confidence: 70,
            click_event_id: bestMatch.id,
            matched_field: email && bestMatch.normalized_email === email ? 'email' : 'phone'
        };
    } catch (error) {
        console.error('Error matching click event:', error);
        return null;
    }
}

// app/api/google/conversions/enhance/route.ts (add this function)

async function findGoogleLeadFormMatch(
    email: string | null,
    phone: string | null,
    businessId: string
): Promise<MatchResult | null> {
    try {
        // Get Google Ads accounts for this business
        const { data: accounts } = await supabase
            .from('google_ads_accounts')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_active', true);

        if (!accounts || accounts.length === 0) {
            console.log('No Google Ads accounts found for business');
            return null;
        }

        // For each account, query Google Ads API directly
        for (const account of accounts) {
            try {
                // Now this method exists!
                const leadForms = await googleAdsClient.getLeadFormSubmissions(
                    account.customer_id,
                    account.refresh_token
                );

                // Process the results
                if (leadForms && leadForms.length > 0) {
                    for (const submission of leadForms) {
                        // Normalize the submission data for comparison
                        const submissionEmail = normalizeEmail(submission.email);
                        const submissionPhone = normalizePhone(submission.phone);

                        // Check for matches
                        const emailMatch = email && submissionEmail &&
                            email.toLowerCase() === submissionEmail.toLowerCase();
                        const phoneMatch = phone && submissionPhone &&
                            phone === submissionPhone;

                        if (emailMatch || phoneMatch) {
                            console.log('Found Google Lead Form match!');
                            return {
                                gclid: null, // Lead forms don't have GCLID
                                match_type: 'google_lead_form',
                                match_confidence: 90,
                                google_lead_id: submission.id,
                                campaign_id: submission.campaign,
                                matched_field: emailMatch ? 'email' : 'phone'
                            };
                        }
                    }
                }
            } catch (error) {
                console.error(`Error querying lead forms for account ${account.customer_id}:`, error);
                // Continue to next account
            }
        }

        return null;
    } catch (error) {
        console.error('Error finding Google lead form match:', error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const businessId = formData.get('businessId') as string;
        const conversionActionName = formData.get('conversionActionName') as string || 'Offline Purchase';

        if (!file || !businessId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Parse CSV
        const csvText = await file.text();
        const records: Record[] = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            cast: true,
            cast_date: true
        });

        console.log(`Processing ${records.length} records for enhancement`);

        // Process each record
        const enhancedRecords = [];
        const matchStats = {
            total: records.length,
            gclid_matched: 0,
            lead_form_matched: 0,
            enhanced_only: 0,
            no_match: 0
        };

        for (const record of records) {
            // Normalize the data
            const normalizedEmail = normalizeEmail(record.email ?? record.Email ?? record.EMAIL ?? '');
            const normalizedPhone = normalizePhone(record.phone ?? record.Phone ?? record.PHONE ?? record.phone_number ?? '');

            // Parse purchase date
            const purchaseDate = new Date(
                record.purchase_date ||
                record.date ||
                record.Date ||
                record.DATE ||
                record.timestamp ||
                new Date()
            );

            // Try to find matching click event
            let match = await findClickEventMatch(
                normalizedEmail,
                normalizedPhone,
                purchaseDate,
                businessId
            );

            if (!match?.gclid) {
                const leadFormMatch = await findGoogleLeadFormMatch(
                    normalizedEmail,
                    normalizedPhone,
                    businessId
                );

                // Use lead form match if found
                if (leadFormMatch) {
                    match = leadFormMatch;
                }
            }
            // Build enhanced record with all Google Ads required fields
            const enhancedRecord = {
                // Original data
                ...record,

                // Google Ads required fields
                'Google Click ID': match?.gclid || '',
                'Conversion Name': conversionActionName,
                'Conversion Time': purchaseDate.toISOString().replace('T', ' ').replace('.000Z', '+00:00'),
                'Conversion Value': record.purchase_amount || record.amount || record.value || '',
                'Conversion Currency': 'USD',
                'Google Lead ID': match?.google_lead_id || '',

                // Enhanced conversion fields (matching upload service expectations)
                'email': normalizedEmail || record.email || '',                    // Changed from 'Email'
                'phone': normalizedPhone || record.phone || '',                    // Changed from 'Phone'
                'first_name': record.first_name || record.firstName || '',         // Changed from 'First Name'
                'last_name': record.last_name || record.lastName || '',            // Changed from 'Last Name'
                'street_address': record.address || record.street || '',           // Changed from 'Street Address'
                'city': record.city || '',                                         // Keep as is
                'state': record.state || record.region || '',                     // Keep as is
                'zip_code': record.zip || record.zip_code || record.postal_code || '', // Changed from 'Postal Code'
                'country': record.country || 'US',                                // Keep as is

                // Metadata for tracking
                'Match Type': match?.match_type || 'no_match',
                'Match Confidence': match?.match_confidence || 0,
                'Match Field': match?.matched_field || '',
                'Click Event ID': match?.click_event_id || '',
                'Order ID': record.order_id || record.orderId || record.id || `${businessId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

            enhancedRecords.push(enhancedRecord);

            if (match?.gclid) {
                matchStats.gclid_matched++;
            } else if (match?.match_type === 'google_lead_form') {
                matchStats.lead_form_matched++;
            } else if (match?.match_type === 'enhanced_only') {
                matchStats.enhanced_only++;
            } else {
                matchStats.no_match++;
            }
        }

        // Generate enhanced CSV with proper column order for Google Ads
        const googleAdsColumns = [
            'Google Click ID',
            'Conversion Name',
            'Conversion Time',
            'Conversion Value',
            'Conversion Currency',
            'Order ID',
            'email',
            'phone',
            'first_name',
            'last_name',
            'street_address',
            'city',
            'state',
            'zip_code',
            'country',
            'Match Type',
            'Match Confidence',
            'Match Field',
            'Click Event ID'
        ];

        // Add any original columns not in our standard set
        const originalColumns = Object.keys(records[0] || {});
        const additionalColumns = originalColumns.filter(col =>
            !['email', 'phone', 'first_name', 'last_name', 'city', 'state', 'zip_code', 'purchase_amount', 'purchase_date', 'order_id'].includes(col.toLowerCase())
        );

        const allColumns = [...googleAdsColumns, ...additionalColumns];

        // Generate CSV
        const enhancedCsv = stringify(enhancedRecords, {
            header: true,
            columns: allColumns
        });

        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `enhanced_conversions_${timestamp}.csv`;

        // Log the enhancement results
        console.log('Enhancement complete:', matchStats);

        // Return enhanced CSV as downloadable file
        return new NextResponse(enhancedCsv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'X-Match-Stats': JSON.stringify(matchStats)
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Enhancement error:', error);
        return NextResponse.json(
            { error: 'Failed to enhance CSV', details: error.message },
            { status: 500 }
        );
    }
}