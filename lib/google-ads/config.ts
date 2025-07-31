// lib/google-ads/config.ts
import { GoogleAdsApi, enums } from 'google-ads-api';
import crypto from 'crypto';

// Environment variables needed:
// GOOGLE_ADS_CLIENT_ID - OAuth2 client ID
// GOOGLE_ADS_CLIENT_SECRET - OAuth2 client secret
// GOOGLE_ADS_DEVELOPER_TOKEN - Developer token from Google Ads
// GOOGLE_ADS_MANAGER_CUSTOMER_ID - Your MCC account ID

export interface GoogleAdsConfig {
    client_id: string;
    client_secret: string;
    developer_token: string;
    refresh_token?: string;
    customer_id?: string;
    login_customer_id?: string; // MCC account ID for accessing client accounts
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

    // Get authenticated customer instance
    async getCustomer(customerId: string, refreshToken: string) {
        // Remove hyphens from customer ID
        const cleanCustomerId = customerId.replace(/-/g, '');

        return this.client.Customer({
            customer_id: cleanCustomerId,
            refresh_token: refreshToken,
            login_customer_id: this.config.login_customer_id?.replace(/-/g, ''),
        });
    }

    // Get list of accessible accounts under MCC
    async getAccessibleAccounts(refreshToken: string) {
        try {
            // Use the MCC account to get accessible accounts
            const mccCustomerId = (this.config.login_customer_id || process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID || '').replace(/-/g, '');

            if (!mccCustomerId) {
                throw new Error('Manager Customer ID (MCC) is required');
            }

            const customer = this.client.Customer({
                customer_id: mccCustomerId,
                refresh_token: refreshToken,
                login_customer_id: mccCustomerId,
            });

            // Query to get all customer clients
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

    // Get conversion actions for an account
    async getConversionActions(customerId: string, refreshToken: string) {
        try {
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
                  conversion_action.value_settings.always_use_default_value
                FROM conversion_action
                WHERE conversion_action.status = 'ENABLED'
            `;

            const response = await customer.query(query);

            return response.map((row: any) => ({
                id: row.conversion_action.id.toString(),
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
            }));
        } catch (error) {
            console.error('Error fetching conversion actions:', error);
            throw error;
        }
    }

    // Helper function to hash PII
    private hashValue(value: string): string {
        if (!value) return '';
        return crypto
            .createHash('sha256')
            .update(value.toLowerCase().trim())
            .digest('hex');
    }

    // Upload enhanced conversions
    async uploadEnhancedConversions(
        customerId: string,
        refreshToken: string,
        conversions: EnhancedConversionData[]
    ) {
        try {
            const customer = await this.getCustomer(customerId, refreshToken);

            // Prepare the conversions in the correct format for google-ads-api
            const uploadRequest = {
                customer_id: customerId.replace(/-/g, ''),
                conversions: conversions.map(conv => {
                    // Build user identifiers in the format expected by the API
                    const userIdentifiers: any[] = [];

                    // Add hashed email if available
                    if (conv.hashedEmail) {
                        userIdentifiers.push({
                            hashed_email: conv.hashedEmail,
                        });
                    }

                    // Add hashed phone if available
                    if (conv.hashedPhoneNumber) {
                        userIdentifiers.push({
                            hashed_phone_number: conv.hashedPhoneNumber,
                        });
                    }

                    // Add address info if available
                    if (conv.addressInfo) {
                        userIdentifiers.push({
                            address_info: {
                                hashed_first_name: conv.addressInfo.hashedFirstName,
                                hashed_last_name: conv.addressInfo.hashedLastName,
                                city: conv.addressInfo.city,
                                state: conv.addressInfo.state,
                                country_code: conv.addressInfo.countryCode,
                                postal_code: conv.addressInfo.postalCode,
                            },
                        });
                    }

                    return {
                        gclid: conv.gclid,
                        conversion_action: conv.conversionAction,
                        conversion_date_time: conv.conversionDateTime,
                        conversion_value: conv.conversionValue,
                        currency_code: conv.currencyCode || 'USD',
                        order_id: conv.orderId,
                        user_identifiers: userIdentifiers,
                        consent: {
                            ad_storage: enums.ConsentStatus.GRANTED,
                            ad_user_data: enums.ConsentStatus.GRANTED,
                            ad_personalization: enums.ConsentStatus.GRANTED,
                        },
                    };
                }),
                partial_failure: true,
                validate_only: false,
            };

            // Upload conversions
            const response = await customer.conversionUploads.uploadClickConversions({
                customer_id: customerId.replace(/-/g, ''),
                conversions: conversions.map(conv => {
                    // Build user identifiers in the format expected by the API
                    const userIdentifiers: any[] = [];

                    // Add hashed email if available
                    if (conv.hashedEmail) {
                        userIdentifiers.push({
                            hashed_email: conv.hashedEmail,
                        });
                    }

                    // Add hashed phone if available
                    if (conv.hashedPhoneNumber) {
                        userIdentifiers.push({
                            hashed_phone_number: conv.hashedPhoneNumber,
                        });
                    }

                    // Add address info if available
                    if (conv.addressInfo) {
                        userIdentifiers.push({
                            address_info: {
                                hashed_first_name: conv.addressInfo.hashedFirstName,
                                hashed_last_name: conv.addressInfo.hashedLastName,
                                city: conv.addressInfo.city,
                                state: conv.addressInfo.state,
                                country_code: conv.addressInfo.countryCode,
                                postal_code: conv.addressInfo.postalCode,
                            },
                        });
                    }

                    return {
                        gclid: conv.gclid,
                        conversion_action: conv.conversionAction,
                        conversion_date_time: conv.conversionDateTime,
                        conversion_value: conv.conversionValue,
                        currency_code: conv.currencyCode || 'USD',
                        order_id: conv.orderId,
                        user_identifiers: userIdentifiers,
                        consent: {
                            ad_storage: enums.ConsentStatus.GRANTED,
                            ad_user_data: enums.ConsentStatus.GRANTED,
                            ad_personalization: enums.ConsentStatus.GRANTED,
                        },
                    };
                }),
                partial_failure: true,
                validate_only: false,
                debug_enabled: false,
                toJSON: () => ({}), // Add this method as required by the type
            } as any);

            return {
                success: true,
                results: response.results,
                partialFailureError: response.partial_failure_error,
            };
        } catch (error) {
            console.error('Google Ads upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

// Types for enhanced conversions - simplified to match what we actually use
export interface EnhancedConversionData {
    gclid: string;
    conversionAction: string; // Format: customers/{customer_id}/conversionActions/{conversion_action_id}
    conversionDateTime: string; // ISO format
    conversionValue: number;
    currencyCode?: string;
    orderId?: string;

    // User identifiers - simplified format
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

// Initialize default client
export const googleAdsClient = new GoogleAdsClient();