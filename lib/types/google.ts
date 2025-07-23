export interface OfflineConversion {
    gclid: string;
    conversionActionId?: string;
    conversionAction: string;
    conversionDateTime: string;
    conversionValue: number;
    conversionCurrency: string;
    hashedEmail?: string;
    hashedPhoneNumber?: string;
    orderId?: string;
}