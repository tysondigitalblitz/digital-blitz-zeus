// lib/google-ads/enhanced-conversions.ts
import crypto from 'crypto';
import { EnhancedClickEvent } from '../types/geolocation';

export function formatEnhancedConversion(event: EnhancedClickEvent, conversionValue: number) {
    // Hash functions
    const hash = (value: string) => {
        if (!value) return undefined;
        return crypto
            .createHash('sha256')
            .update(value.toLowerCase().trim())
            .digest('hex');
    };

    // Format phone for Google (E.164)
    const formatPhone = (phone: string) => {
        if (!phone) return undefined;
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) cleaned = '1' + cleaned;
        return hash('+' + cleaned);
    };

    // Build enhanced conversion data
    const enhancedData = {
        gclid: event.gclid,
        conversion_action: `customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${process.env.CONVERSION_ACTION_ID}`,
        conversion_date_time: event.timestamp,
        conversion_value: conversionValue,
        currency_code: 'USD',

        // User identifiers
        user_identifiers: [
            // Email
            ...(event.email ? [{
                hashed_email: hash(event.email),
                user_identifier_source: 'FIRST_PARTY' as const
            }] : []),

            // Phone
            ...(event.phone ? [{
                hashed_phone_number: formatPhone(event.phone),
                user_identifier_source: 'FIRST_PARTY' as const
            }] : []),

            // Address from geo data
            ...(event.geo_city && event.geo_postal_code ? [{
                address_info: {
                    hashed_first_name: undefined, // Would need from form
                    hashed_last_name: undefined,  // Would need from form
                    city: event.geo_city,
                    state: event.geo_region,
                    country_code: event.geo_country,
                    postal_code: event.geo_postal_code
                },
                user_identifier_source: 'FIRST_PARTY' as const
            }] : [])
        ],

        // Custom variables for additional tracking
        custom_variables: [
            {
                key: 'geo_metro',
                value: event.geo_metro_code?.toString() || 'unknown'
            },
            {
                key: 'platform',
                value: event.platform || 'unknown'
            },
            {
                key: 'session_duration',
                value: event.time_on_site?.toString() || '0'
            }
        ],

        // Additional metadata
        user_agent: event.user_agent,

        // Consent (important for compliance)
        consent: {
            ad_storage: 'GRANTED',
            ad_user_data: 'GRANTED',
            ad_personalization: 'GRANTED'
        }
    };

    return enhancedData;
}

// Format for Google Ads Customer Match
export function formatCustomerMatch(events: EnhancedClickEvent[]) {
    const customers = events.map(event => ({
        hashed_email: event.email ? crypto
            .createHash('sha256')
            .update(event.email.toLowerCase().trim())
            .digest('hex') : undefined,

        address_info: event.geo_postal_code ? {
            country_code: event.geo_country,
            postal_code: event.geo_postal_code
        } : undefined,

        // Additional identifiers
        mobile_id: undefined, // Would need mobile app data
        third_party_user_id: event.client_id
    })).filter(c => c.hashed_email || c.address_info);

    return {
        create_job_request: {
            job: {
                customer_match_user_list_job: {
                    user_list: `customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/userLists/${process.env.USER_LIST_ID}`,
                    consent: {
                        ad_storage: 'GRANTED',
                        ad_user_data: 'GRANTED'
                    }
                }
            },
            operations: customers.map(customer => ({
                create: customer
            }))
        }
    };
}