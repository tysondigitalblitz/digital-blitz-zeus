// lib/google-ads/client.ts
import { OfflineConversion } from '../types/google';

export class GoogleAdsConversionUploader {
    private accessToken: string;
    private developerToken: string;
    private apiVersion = 'v15'; // Latest stable version

    constructor() {
        this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
        this.accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN!;
    }

    async uploadOfflineConversions(
        customerId: string,
        conversions: OfflineConversion[]
    ) {
        try {
            // Google Ads API endpoint
            const url = `https://googleads.googleapis.com/${this.apiVersion}/customers/${customerId}/offlineUserDataJobs:create`;

            // Upload in batches of 2000 (Google's limit)
            const batchSize = 2000;
            const results = [];

            for (let i = 0; i < conversions.length; i += batchSize) {
                const batch = conversions.slice(i, i + batchSize);

                // Format conversions for Google Ads API
                const operations = batch.map(conv => ({
                    create: {
                        userIdentifiers: [
                            ...(conv.hashedEmail ? [{
                                hashedEmail: conv.hashedEmail
                            }] : []),
                            ...(conv.hashedPhoneNumber ? [{
                                hashedPhoneNumber: conv.hashedPhoneNumber
                            }] : [])
                        ],
                        transactionAttribute: {
                            conversionAction: `customers/${customerId}/conversionActions/${conv.conversionActionId}`,
                            transactionDateTime: this.formatDateTime(conv.conversionDateTime),
                            transactionAmount: {
                                value: conv.conversionValue,
                                currencyCode: conv.conversionCurrency || 'USD'
                            },
                            transactionId: conv.orderId
                        }
                    }
                }));

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'developer-token': this.developerToken,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        job: {
                            type: 'STORE_SALES_UPLOAD_FIRST_PARTY',
                            storeSalesMetadata: {
                                loyaltyFraction: 1.0,
                                transactionUploadFraction: 1.0
                            }
                        },
                        operations
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Google Ads API error: ${JSON.stringify(error)}`);
                }

                const result = await response.json();
                results.push(result);
            }

            return {
                success: true,
                results,
                totalUploaded: conversions.length
            };

        } catch (error) {
            console.error('Google Ads API error:', error);
            throw error;
        }
    }

    // Alternative: Direct Click Conversion Upload (simpler)
    async uploadClickConversions(
        customerId: string,
        conversions: OfflineConversion[]
    ) {
        try {
            const url = `https://googleads.googleapis.com/${this.apiVersion}/customers/${customerId}/conversionAdjustments:upload`;

            const clickConversions = conversions.map(conv => ({
                gclid: conv.gclid,
                conversionAction: `customers/${customerId}/conversionActions/${conv.conversionActionId}`,
                adjustmentDateTime: new Date().toISOString(),
                adjustmentType: 'ENHANCEMENT',
                conversionDateTime: this.formatDateTime(conv.conversionDateTime),
                adjustedValue: {
                    value: conv.conversionValue,
                    currencyCode: conv.conversionCurrency || 'USD'
                },
                orderId: conv.orderId,
                userIdentifiers: [
                    ...(conv.hashedEmail ? [{
                        hashedEmail: conv.hashedEmail
                    }] : []),
                    ...(conv.hashedPhoneNumber ? [{
                        hashedPhoneNumber: conv.hashedPhoneNumber
                    }] : [])
                ]
            }));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'developer-token': this.developerToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversions: clickConversions,
                    partialFailure: true
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Google Ads API error: ${JSON.stringify(error)}`);
            }

            const result = await response.json();

            return {
                success: true,
                results: result,
                totalUploaded: conversions.length,
                partialFailures: result.partialFailureError || []
            };

        } catch (error) {
            console.error('Google Ads API error:', error);
            throw error;
        }
    }

    private formatDateTime(dateTime: string): string {
        // Google Ads expects format: "yyyy-MM-dd HH:mm:ss+HH:mm"
        const date = new Date(dateTime);
        return date.toISOString().replace('T', ' ').replace('.000Z', '+00:00');
    }
}

// Alternative: Using Google's OAuth2 client for token management
export class GoogleAdsOAuth2Client {
    private clientId: string;
    private clientSecret: string;
    private refreshToken: string;

    constructor() {
        this.clientId = process.env.GOOGLE_ADS_CLIENT_ID!;
        this.clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!;
        this.refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN!;
    }

    async getAccessToken(): Promise<string> {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to refresh access token');
        }

        const data = await response.json();
        return data.access_token;
    }
}