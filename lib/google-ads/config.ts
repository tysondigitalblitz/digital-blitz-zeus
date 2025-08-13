/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/google-ads/config.ts - Fixed Enhanced Conversions Upload
import { GoogleAdsApi } from 'google-ads-api';
// import crypto from 'crypto';

export interface GoogleAdsConfig {
    client_id: string;
    client_secret: string;
    developer_token: string;
    refresh_token?: string;
    customer_id?: string;
    login_customer_id?: string;
}

export class GoogleAdsClient {
    private client: GoogleAdsApi;
    private config: GoogleAdsConfig;

    constructor(config?: Partial<GoogleAdsConfig>) {
        this.config = {
            client_id: config?.client_id || process.env.GOOGLE_ADS_CLIENT_ID!,
            client_secret: config?.client_secret || process.env.GOOGLE_ADS_CLIENT_SECRET!,
            developer_token: config?.developer_token || process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
            login_customer_id: config?.login_customer_id || process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID,
            ...config
        };

        this.client = new GoogleAdsApi({
            client_id: this.config.client_id,
            client_secret: this.config.client_secret,
            developer_token: this.config.developer_token,
        });
    }

    async getCustomer(customerId: string, refreshToken: string) {
        const cleanCustomerId = customerId.replace(/-/g, '');

        return this.client.Customer({
            customer_id: cleanCustomerId,
            refresh_token: refreshToken,
            login_customer_id: this.config.login_customer_id?.replace(/-/g, ''),
        });
    }

    async getAccessibleAccounts(refreshToken: string) {
        try {
            const mccCustomerId = (this.config.login_customer_id || process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID || '').replace(/-/g, '');

            if (!mccCustomerId) {
                throw new Error('Manager Customer ID (MCC) is required');
            }

            const customer = this.client.Customer({
                customer_id: mccCustomerId,
                refresh_token: refreshToken,
                login_customer_id: mccCustomerId,
            });

            const query = `
                SELECT
                  customer_client.id,
                  customer_client.descriptive_name,
                  customer_client.currency_code,
                  customer_client.time_zone,
                  customer_client.status,
                  customer_client.level,
                  customer_client.manager
                FROM customer_client
                WHERE customer_client.status != 'CANCELED'
            `;

            const response = await customer.query(query);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return response.map((row: any) => ({
                customerId: row.customer_client.id.toString(),
                descriptiveName: row.customer_client.descriptive_name,
                currencyCode: row.customer_client.currency_code,
                timeZone: row.customer_client.time_zone,
                level: row.customer_client.level,
                status: row.customer_client.status,
                isManager: row.customer_client.manager,
            }));
        } catch (error) {
            console.error('Error fetching accessible accounts:', error);
            throw error;
        }
    }

    // Update the getConversionActions method in your lib/google-ads/config.ts
    // Replace the existing query with this fixed version:

    async getConversionActions(customerId: string, refreshToken: string) {
        const customer = await this.getCustomer(customerId, refreshToken);

        const query = `
        SELECT 
            conversion_action.id,
            conversion_action.name,
            conversion_action.type,
            conversion_action.category,
            conversion_action.status,
            conversion_action.include_in_conversions_metric,
            conversion_action.value_settings.default_value,
            conversion_action.value_settings.default_currency_code,
            conversion_action.value_settings.always_use_default_value,
            conversion_action.resource_name,
            conversion_action.attribution_model_settings.attribution_model
        FROM conversion_action
        WHERE conversion_action.status = 'ENABLED'
    `;

        const result = await customer.query(query);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return result.map((row: any) => ({
            id: row.conversion_action.id,
            name: row.conversion_action.name,
            type: row.conversion_action.type,
            category: row.conversion_action.category,
            status: row.conversion_action.status,
            includeInConversionsMetric: row.conversion_action.include_in_conversions_metric,
            valueSettings: {
                defaultValue: row.conversion_action.value_settings?.default_value,
                defaultCurrencyCode: row.conversion_action.value_settings?.default_currency_code,
                alwaysUseDefaultValue: row.conversion_action.value_settings?.always_use_default_value,
            },
            resourceName: row.conversion_action.resource_name,
            // Removed trackingCodeType - not available in current API version
            attributionModel: row.conversion_action.attribution_model_settings?.attribution_model
        }));
    }

    // Add this method to your GoogleAdsClient class in config.ts
    async checkEnhancedConversionsForLeads(customerId: string, refreshToken: string) {
        try {
            const customer = await this.getCustomer(customerId, refreshToken);

            const query = `
            SELECT 
                customer.id,
                customer.descriptive_name,
                conversion_tracking_setting.enhanced_conversions_for_leads_enabled,
                conversion_tracking_setting.enhanced_conversions_for_web_enabled
            FROM customer
            LIMIT 1
        `;

            const result = await customer.query(query);
            console.log('Enhanced Conversions Settings:', result);
            return result;
        } catch (error) {
            console.error('Error checking enhanced conversions settings:', error);
            throw error;
        }
    }

    // Add this method to your GoogleAdsClient class in config.ts
    async getLeadFormSubmissions(customerId: string, refreshToken: string) {
        try {
            const customer = await this.getCustomer(customerId, refreshToken);

            const query = `
            SELECT 
                lead_form_submission.resource_name,
                lead_form_submission.id,
                lead_form_submission.campaign,
                lead_form_submission.ad_group,
                lead_form_submission.lead_form_submission_data.lead_form_submission_fields,
                lead_form_submission.submission_date_time
            FROM lead_form_submission
            WHERE segments.date DURING LAST_90_DAYS
            LIMIT 1000
        `;

            const result = await customer.query(query);

            // Process and return the lead form data
            return result.map((row: any) => {
                const fields = row.lead_form_submission?.lead_form_submission_data?.lead_form_submission_fields || [];

                // Extract common fields from the submission
                const getFieldValue = (fieldType: string) => {
                    const field = fields.find((f: any) => f.field_type === fieldType);
                    return field?.field_value || null;
                };

                return {
                    id: row.lead_form_submission.id,
                    resourceName: row.lead_form_submission.resource_name,
                    campaign: row.lead_form_submission.campaign,
                    adGroup: row.lead_form_submission.ad_group,
                    submissionDateTime: row.lead_form_submission.submission_date_time,
                    // Extract common fields
                    email: getFieldValue('EMAIL'),
                    phone: getFieldValue('PHONE_NUMBER'),
                    firstName: getFieldValue('FIRST_NAME'),
                    lastName: getFieldValue('LAST_NAME'),
                    city: getFieldValue('CITY'),
                    state: getFieldValue('PROVINCE'),
                    postalCode: getFieldValue('POSTAL_CODE'),
                    country: getFieldValue('COUNTRY'),
                    // Keep raw fields for any custom fields
                    rawFields: fields
                };
            });
        } catch (error) {
            console.error('Error fetching lead form submissions:', error);
            // Return empty array if error (e.g., no lead forms exist)
            return [];
        }
    }

    async uploadEnhancedConversions(
        customerId: string,
        refreshToken: string,
        conversions: EnhancedConversionData[]
    ) {
        try {
            const customer = await this.getCustomer(customerId, refreshToken);
            const cleanCustomerId = customerId.replace(/-/g, '');

            console.log(`Uploading ${conversions.length} enhanced conversions for customer ${cleanCustomerId}`);

            // Build the conversions array for Enhanced Conversions
            // Build the conversions array for Enhanced Conversions
            const formattedConversions = conversions.map(conv => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const userIdentifiers: any[] = [];

                // Only add email if it exists
                if (conv.hashedEmail) {
                    userIdentifiers.push({
                        hashed_email: conv.hashedEmail
                    });
                }

                // Only add phone if it exists  
                if (conv.hashedPhoneNumber) {
                    userIdentifiers.push({
                        hashed_phone_number: conv.hashedPhoneNumber
                    });
                }

                // Skip address info for now - it might not be supported by this conversion action

                // Ensure we have the correct conversion action resource name
                const conversionAction = conv.conversionAction.startsWith('customers/')
                    ? conv.conversionAction
                    : `customers/${cleanCustomerId}/conversionActions/${conv.conversionAction}`;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const conversion: any = {
                    conversion_action: conversionAction,
                    conversion_date_time: conv.conversion_date_time,
                    conversion_value: conv.conversionValue,
                    currency_code: conv.currencyCode || 'USD',
                    user_identifiers: userIdentifiers
                };

                // Add optional fields
                if (conv.gclid) {
                    conversion.gclid = conv.gclid;
                }
                if (conv.orderId) {
                    conversion.order_id = conv.orderId;  // ← Note: snake_case
                }

                // Enhanced Conversions consent (required)
                conversion.consent = {
                    ad_user_data: 'GRANTED',           // ← Note: snake_case
                    ad_personalization: 'GRANTED'      // ← Note: snake_case
                };

                return conversion;
            });

            // Log the first conversion for debugging
            if (formattedConversions.length > 0) {
                console.log('Sample conversion data:', JSON.stringify(formattedConversions[0], null, 2));
            }

            // Upload Enhanced Conversions using uploadClickConversions with user identifiers
            const response = await customer.conversionUploads.uploadClickConversions({
                customer_id: cleanCustomerId,
                conversions: formattedConversions,
                partial_failure: true,
                validate_only: false,
                debug_enabled: false,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                toJSON: function (): { [k: string]: any; } {
                    throw new Error('Function not implemented.');
                }
            });

            console.log('Enhanced conversion upload response:', {
                hasResults: !!response.results,
                resultCount: response.results?.length || 0,
                hasPartialFailure: !!response.partial_failure_error,
                partialFailureMessage: response.partial_failure_error?.message
            });

            // Check for partial failures
            if (response.partial_failure_error) {
                console.error('Partial failure in upload:', {
                    message: response.partial_failure_error.message,
                    code: response.partial_failure_error.code,
                    details: response.partial_failure_error.details
                });
            }

            return {
                success: true,
                results: response.results,
                partialFailureError: response.partial_failure_error,
                uploadedCount: response.results?.length || 0
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Enhanced conversion upload error:', {
                message: error.message,
                code: error.code,
                details: error.details,
                requestId: error.request_id
            });

            return {
                success: false,
                error: error.message || 'Unknown error',
                errorCode: error.code,
                errorDetails: error.details,
            };
        }
    }
}

export interface EnhancedConversionData {
    gclid?: string; // Optional for Enhanced Conversions for Leads
    conversionAction: string;
    conversion_date_time: string;
    conversionValue: number;
    currencyCode?: string;
    orderId?: string;
    hashedEmail?: string;
    hashedPhoneNumber?: string;
    addressInfo?: {
        hashedFirstName?: string;
        hashedLastName?: string;
        city?: string;
        state?: string;
        countryCode?: string;
        postalCode?: string;
    };
}

export const googleAdsClient = new GoogleAdsClient();