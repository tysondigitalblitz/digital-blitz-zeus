// lib/meta-conversions/service.ts
import crypto from 'crypto';
import { ConversionUpload, MetaApiResponse, Client } from '../types/meta-conversions';
import type { UserData } from '../types/meta-conversions';

export class MetaConversionsService {
    private baseUrl = 'https://graph.facebook.com/v18.0';

    // Hash user data for Meta (they require SHA256)
    private hashUserData(data: string): string {
        if (!data) return '';
        return crypto
            .createHash('sha256')
            .update(data.toLowerCase().trim())
            .digest('hex');
    }

    // Format user data according to Meta requirements
    private formatUserData(userData: UserData): Record<string, string> {
        const formatted: Record<string, string> = {};

        if (userData.email) {
            formatted.em = this.hashUserData(userData.email);
        }
        if (userData.phone) {
            // Remove all non-numeric characters and add country code if missing
            let phone = userData.phone.replace(/\D/g, '');
            if (!phone.startsWith('1') && phone.length === 10) {
                phone = '1' + phone; // Add US country code
            }
            formatted.ph = this.hashUserData(phone);
        }
        if (userData.firstName) {
            formatted.fn = this.hashUserData(userData.firstName);
        }
        if (userData.lastName) {
            formatted.ln = this.hashUserData(userData.lastName);
        }
        if (userData.dateOfBirth) {
            formatted.db = userData.dateOfBirth.replace(/-/g, '');
        }
        if (userData.city) {
            formatted.ct = this.hashUserData(userData.city);
        }
        if (userData.state) {
            formatted.st = this.hashUserData(userData.state);
        }
        if (userData.zipCode) {
            formatted.zp = this.hashUserData(userData.zipCode);
        }
        if (userData.country) {
            formatted.country = this.hashUserData(userData.country);
        }
        if (userData.externalId) {
            formatted.external_id = this.hashUserData(userData.externalId);
        }
        if (userData.clientIpAddress) {
            formatted.client_ip_address = userData.clientIpAddress;
        }
        if (userData.clientUserAgent) {
            formatted.client_user_agent = userData.clientUserAgent;
        }
        if (userData.fbp) {
            formatted.fbp = userData.fbp; // Facebook pixel cookie
        }
        if (userData.fbc) {
            formatted.fbc = userData.fbc; // Facebook click ID
        }

        return formatted;
    }

    // Send conversions to Meta
    async sendConversions(
        client: Client,
        conversions: ConversionUpload[]
    ): Promise<MetaApiResponse> {
        const url = `${this.baseUrl}/${client.meta_pixel_id}/events`;

        // Format events for Meta API
        const data = conversions.map(conv => ({
            event_name: conv.event_name,
            event_time: Math.floor(new Date(conv.event_time).getTime() / 1000), // Unix timestamp
            event_id: conv.event_id,
            event_source_url: conv.event_source_url,
            action_source: conv.action_source || 'website',
            user_data: this.formatUserData(conv.user_data),
            custom_data: conv.custom_data,
            data_processing_options: [] // Required for CCPA compliance
        }));

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data,
                    access_token: client.meta_access_token,
                    upload_tag: conversions[0]?.batch_id, // For tracking in Meta Events Manager
                    test_event_code: process.env.META_TEST_EVENT_CODE // Optional: for testing
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'Meta API error');
            }

            return {
                events_received: result.events_received || 0,
                events_dropped: result.events_dropped || 0,
                error_count: result.error?.error_user_msg ? 1 : 0,
                response_data: result,
                warnings: result.warnings || [],
                errors: result.error ? [result.error] : []
            };

        } catch (error) {
            console.error('Meta API Error:', error);
            throw error;
        }
    }

    // Validate conversion data before sending
    validateConversion(conversion: ConversionUpload): string[] {
        const errors: string[] = [];

        // Required fields
        if (!conversion.event_name) {
            errors.push('event_name is required');
        }
        if (!conversion.event_time) {
            errors.push('event_time is required');
        }
        if (!conversion.event_id) {
            errors.push('event_id is required');
        }

        // Validate event_name is a standard or custom event
        const validEvents = [
            'PageView', 'ViewContent', 'Search', 'AddToCart',
            'AddToWishlist', 'InitiateCheckout', 'AddPaymentInfo',
            'Purchase', 'Lead', 'CompleteRegistration', 'Contact',
            'CustomizeProduct', 'Donate', 'FindLocation', 'Schedule',
            'StartTrial', 'SubmitApplication', 'Subscribe'
        ];

        if (!validEvents.includes(conversion.event_name) &&
            !conversion.event_name.startsWith('fb_mobile_')) {
            errors.push(`Invalid event_name: ${conversion.event_name}`);
        }

        // Validate user_data has at least one identifier
        const userData = conversion.user_data || {};
        const hasIdentifier = userData.email || userData.phone ||
            userData.externalId || userData.fbp || userData.fbc;

        if (!hasIdentifier) {
            errors.push('At least one user identifier is required (email, phone, external_id, fbp, or fbc)');
        }

        // Validate purchase events have required custom_data
        if (conversion.event_name === 'Purchase') {
            if (!conversion.custom_data?.value) {
                errors.push('Purchase events require custom_data.value');
            }
            if (!conversion.custom_data?.currency) {
                errors.push('Purchase events require custom_data.currency');
            }
        }

        // Validate event_time is not too old (Meta accepts up to 7 days)
        const eventDate = new Date(conversion.event_time);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (eventDate < sevenDaysAgo) {
            errors.push('event_time cannot be more than 7 days old');
        }

        return errors;
    }

    // Process batch upload
    async processBatchUpload(
        client: Client,
        batchId: string,
        conversions: ConversionUpload[]
    ): Promise<{
        success: boolean;
        response?: MetaApiResponse;
        errors?: string[];
    }> {
        // Validate all conversions
        const validationErrors: string[] = [];
        conversions.forEach((conv, index) => {
            const errors = this.validateConversion(conv);
            if (errors.length > 0) {
                validationErrors.push(`Row ${index + 1}: ${errors.join(', ')}`);
            }
        });

        if (validationErrors.length > 0) {
            return {
                success: false,
                errors: validationErrors
            };
        }

        try {
            // Send to Meta in batches of 1000 (Meta's limit)
            const batchSize = 1000;
            const responses: MetaApiResponse[] = [];

            for (let i = 0; i < conversions.length; i += batchSize) {
                const batch = conversions.slice(i, i + batchSize);
                const response = await this.sendConversions(client, batch);
                responses.push(response);
            }

            // Aggregate responses
            const aggregatedResponse: MetaApiResponse = {
                events_received: responses.reduce((sum, r) => sum + r.events_received, 0),
                events_dropped: responses.reduce((sum, r) => sum + r.events_dropped, 0),
                error_count: responses.reduce((sum, r) => sum + r.error_count, 0),
                response_data: { responses },
                warnings: responses.flatMap(r => r.warnings || []),
                errors: responses.flatMap(r => r.errors || [])
            };

            return {
                success: true,
                response: aggregatedResponse
            };

        } catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
}