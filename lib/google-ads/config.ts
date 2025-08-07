// lib/google-ads/config.ts - ACTUALLY Fixed version
import { GoogleAdsApi } from 'google-ads-api';
import crypto from 'crypto';

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

    async getConversionActions(customerId: string, refreshToken: string) {
        // Use getCustomer to ensure login_customer_id is included
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
                conversion_action.tracking_code_type,
                conversion_action.attribution_model_settings.attribution_model
            FROM conversion_action
            WHERE conversion_action.status = 'ENABLED'
        `;

        const result = await customer.query(query);

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
            trackingCodeType: row.conversion_action.tracking_code_type,
            attributionModel: row.conversion_action.attribution_model_settings?.attribution_model
        }));
    }

    private hashValue(value: string): string {
        if (!value) return '';
        return crypto
            .createHash('sha256')
            .update(value.toLowerCase().trim())
            .digest('hex');
    }

    async uploadEnhancedConversions(
        customerId: string,
        refreshToken: string,
        conversions: EnhancedConversionData[]
    ) {
        try {
            const customer = await this.getCustomer(customerId, refreshToken);

            // Build the conversions array properly
            const formattedConversions = conversions.map(conv => {
                const userIdentifiers: any[] = [];

                if (conv.hashedEmail) {
                    userIdentifiers.push({
                        hashedEmail: conv.hashedEmail,
                        userIdentifierSource: 'FIRST_PARTY'
                    });
                }

                if (conv.hashedPhoneNumber) {
                    userIdentifiers.push({
                        hashedPhoneNumber: conv.hashedPhoneNumber,
                        userIdentifierSource: 'FIRST_PARTY'
                    });
                }

                if (conv.addressInfo) {
                    const addressIdentifier: any = {
                        userIdentifierSource: 'FIRST_PARTY',
                        addressInfo: {}
                    };

                    if (conv.addressInfo.hashedFirstName) {
                        addressIdentifier.addressInfo.hashedFirstName = conv.addressInfo.hashedFirstName;
                    }
                    if (conv.addressInfo.hashedLastName) {
                        addressIdentifier.addressInfo.hashedLastName = conv.addressInfo.hashedLastName;
                    }
                    if (conv.addressInfo.city) {
                        addressIdentifier.addressInfo.city = conv.addressInfo.city;
                    }
                    if (conv.addressInfo.state) {
                        addressIdentifier.addressInfo.state = conv.addressInfo.state;
                    }
                    if (conv.addressInfo.countryCode) {
                        addressIdentifier.addressInfo.countryCode = conv.addressInfo.countryCode;
                    }
                    if (conv.addressInfo.postalCode) {
                        addressIdentifier.addressInfo.postalCode = conv.addressInfo.postalCode;
                    }

                    userIdentifiers.push(addressIdentifier);
                }

                // Make sure we have the right format for conversion_action
                const conversionAction = conv.conversionAction.startsWith('customers/')
                    ? conv.conversionAction
                    : `customers/${customerId.replace(/-/g, '')}/conversionActions/${conv.conversionAction}`;

                const conversion: any = {
                    conversionAction: conversionAction,
                    conversionDateTime: conv.conversionDateTime,
                    conversionValue: conv.conversionValue,
                    currencyCode: conv.currencyCode || 'USD',
                };

                // Only add optional fields if they exist
                if (conv.gclid) {
                    conversion.gclid = conv.gclid;
                }
                if (conv.orderId) {
                    conversion.orderId = conv.orderId;
                }
                if (userIdentifiers.length > 0) {
                    conversion.userIdentifiers = userIdentifiers;
                }

                // Add consent
                conversion.consent = {
                    adUserData: 'GRANTED',
                    adPersonalization: 'GRANTED'
                };

                return conversion;
            });

            console.log('Uploading conversions:', {
                customerId,
                conversionCount: formattedConversions.length,
                sampleConversion: JSON.stringify(formattedConversions[0], null, 2)
            });

            // The google-ads-api library requires these fields
            const response = await customer.conversionUploads.uploadClickConversions({
                conversions: formattedConversions,
                partialFailure: true,
                validateOnly: false,
                // These are required by the type definition but not actually used
                customerId: customerId.replace(/-/g, ''),
                debugEnabled: false
            } as any); // Type assertion to handle the toJSON requirement

            console.log('Upload response:', {
                hasResults: !!response.results,
                resultCount: response.results?.length,
                hasPartialFailure: !!response.partial_failure_error
            });

            return {
                success: true,
                results: response.results,
                partialFailureError: response.partial_failure_error,
            };
        } catch (error: any) {
            console.error('Google Ads upload error:', {
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
    gclid?: string; // Make optional since Enhanced Conversions for Leads doesn't require it
    conversionAction: string;
    conversionDateTime: string;
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