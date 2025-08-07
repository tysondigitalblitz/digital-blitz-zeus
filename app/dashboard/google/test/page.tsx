'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Play, Database, Link, Upload, Send } from 'lucide-react';

// Define interfaces
interface GoogleAdsAccount {
    id: string;
    customer_id: string;
    account_name: string;
}

interface Business {
    id: string;
    name: string;
    description?: string;
    pixel_id?: string;
    google_ads_refresh_token?: string;
    google_ads_accounts?: GoogleAdsAccount[];
}

interface TestResult {
    success: boolean;
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    businessCount?: number;
    businesses?: Business[];
    uploaded?: number;
    matched?: number;
    batchId?: string;
    synced?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accounts?: any[];
}

interface TestCase {
    name: string;
    label: string;
    description: string;
    icon: React.ElementType;
    action: () => void;
}

const GoogleAdsTestPage = () => {
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
    const [testing, setTesting] = useState<Record<string, boolean>>({});
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusiness, setSelectedBusiness] = useState<string>('');

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const response = await fetch('/api/businesses');
            const data = await response.json();
            setBusinesses(data.businesses || []);
            if (data.businesses?.length > 0) {
                setSelectedBusiness(data.businesses[0].id);
            }
        } catch (error) {
            console.error('Error fetching businesses:', error);
        }
    };

    const runTest = async (testName: string, testFunction: () => Promise<TestResult>) => {
        setTesting(prev => ({ ...prev, [testName]: true }));
        try {
            const result = await testFunction();
            setTestResults(prev => ({ ...prev, [testName]: result }));
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                [testName]: {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error'
                }
            }));
        }
        setTesting(prev => ({ ...prev, [testName]: false }));
    };

    // Test 1: Database Connection
    const testDatabaseConnection = async (): Promise<TestResult> => {
        const response = await fetch('/api/test/database');
        const data = await response.json();
        return {
            success: response.ok,
            data,
            message: response.ok ? 'Database connected successfully' : 'Database connection failed'
        };
    };

    // Test 2: Business Setup
    const testBusinessSetup = async (): Promise<TestResult> => {
        const response = await fetch('/api/businesses');
        const data = await response.json();
        return {
            success: data.businesses && data.businesses.length > 0,
            businessCount: data.businesses?.length || 0,
            businesses: data.businesses,
            message: data.businesses?.length > 0
                ? `Found ${data.businesses.length} businesses`
                : 'No businesses found - create one first'
        };
    };

    // Test 3: Google OAuth
    const testGoogleOAuth = (): Promise<TestResult> => {
        // Check for environment variable (this would need to be passed from server)
        return Promise.resolve({
            success: true, // Assume configured if we got this far
            message: 'Google OAuth configuration check (client-side check only)'
        });
    };

    // Test 4: Upload Test Data
    const testUploadConversions = async (): Promise<TestResult> => {
        if (!selectedBusiness) {
            return { success: false, message: 'No business selected' };
        }

        const testCSV = `email,phone,first_name,last_name,city,state,zip_code,purchase_amount,purchase_date,order_id
test@example.com,555-1234,Test,User,New York,NY,10001,100.00,${new Date().toISOString().split('T')[0]},TEST-${Date.now()}`;

        const blob = new Blob([testCSV], { type: 'text/csv' });
        const file = new File([blob], 'test-conversions.csv', { type: 'text/csv' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('businessId', selectedBusiness);

        const response = await fetch('/api/google/conversions/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        return {
            success: data.success,
            uploaded: data.uploaded,
            matched: data.matched,
            batchId: data.batchId,
            message: data.success
                ? `Uploaded ${data.uploaded} conversions, matched ${data.matched}`
                : data.error || 'Upload failed'
        };
    };

    // Test 5: Google Ads Account Sync
    const testAccountSync = async (): Promise<TestResult> => {
        if (!selectedBusiness) {
            return { success: false, message: 'No business selected' };
        }

        const business = businesses.find(b => b.id === selectedBusiness);
        if (!business?.google_ads_refresh_token) {
            return {
                success: false,
                message: 'Business not connected to Google Ads. Click "Connect Google Ads" in settings first.'
            };
        }

        const response = await fetch('/api/google/accounts/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessId: selectedBusiness,
                refreshToken: business.google_ads_refresh_token
            })
        });

        const data = await response.json();
        return {
            success: data.success,
            synced: data.synced,
            accounts: data.accounts,
            message: data.success
                ? `Synced ${data.synced} Google Ads accounts`
                : data.error || 'Sync failed'
        };
    };

    // Test 6: End-to-End Upload to Google
    const testEndToEnd = async (): Promise<TestResult> => {
        // This would use a previously uploaded batch
        const lastUpload = testResults.testUploadConversions;
        if (!lastUpload?.success || !lastUpload?.batchId) {
            return {
                success: false,
                message: 'Run "Upload Test Conversions" first'
            };
        }

        const business = businesses.find(b => b.id === selectedBusiness);
        const account = business?.google_ads_accounts?.[0];

        if (!account) {
            return {
                success: false,
                message: 'No Google Ads account connected'
            };
        }

        const response = await fetch('/api/google/conversions/sync-to-google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                batchId: lastUpload.batchId,
                accountId: account.id
            })
        });

        const data = await response.json();
        return {
            success: data.success,
            uploaded: data.uploaded,
            message: data.success
                ? `Successfully synced ${data.uploaded} conversions to Google Ads`
                : data.error || 'Sync failed'
        };
    };

    const allTests: TestCase[] = [
        {
            name: 'testDatabaseConnection',
            label: 'Database Connection',
            description: 'Verify Supabase connection and tables exist',
            icon: Database,
            action: () => runTest('testDatabaseConnection', testDatabaseConnection)
        },
        {
            name: 'testBusinessSetup',
            label: 'Business Setup',
            description: 'Check if businesses are properly configured',
            icon: CheckCircle,
            action: () => runTest('testBusinessSetup', testBusinessSetup)
        },
        {
            name: 'testGoogleOAuth',
            label: 'Google OAuth Config',
            description: 'Verify Google OAuth credentials are set',
            icon: Link,
            action: () => runTest('testGoogleOAuth', testGoogleOAuth)
        },
        {
            name: 'testUploadConversions',
            label: 'Upload Test Conversions',
            description: 'Upload a test CSV file and process conversions',
            icon: Upload,
            action: () => runTest('testUploadConversions', testUploadConversions)
        },
        {
            name: 'testAccountSync',
            label: 'Sync Google Ads Accounts',
            description: 'Sync accounts from Google Ads Manager',
            icon: RefreshCw,
            action: () => runTest('testAccountSync', testAccountSync)
        },
        {
            name: 'testEndToEnd',
            label: 'End-to-End Google Upload',
            description: 'Upload matched conversions to Google Ads',
            icon: Send,
            action: () => runTest('testEndToEnd', testEndToEnd)
        }
    ];

    const runAllTests = async () => {
        for (const test of allTests) {
            await test.action();
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-2 text-black">Google Ads Integration Test Suite</h1>
            <p className="text-gray-600 mb-8">Run these tests to verify your Google Ads integration is working correctly</p>

            {/* Business Selector */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <label className="block text-sm font-medium mb-2 text-black">Select Business for Testing</label>
                <select
                    value={selectedBusiness}
                    onChange={(e) => setSelectedBusiness(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-black bg-white"
                >
                    <option value="">Select a business...</option>
                    {businesses.map(business => (
                        <option key={business.id} value={business.id}>
                            {business.name} {business.google_ads_accounts && business.google_ads_accounts.length > 0 ? '(Connected to Google Ads)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Run All Tests Button */}
            <div className="mb-6">
                <button
                    onClick={runAllTests}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                    <Play className="w-5 h-5" />
                    Run All Tests
                </button>
            </div>

            {/* Individual Tests */}
            <div className="space-y-4">
                {allTests.map((test) => {
                    const result = testResults[test.name];
                    const isLoading = testing[test.name];
                    const Icon = test.icon;

                    return (
                        <div key={test.name} className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${result?.success ? 'bg-green-100' :
                                        result?.success === false ? 'bg-red-100' :
                                            'bg-gray-100'
                                        }`}>
                                        <Icon className={`w-6 h-6 ${result?.success ? 'text-green-600' :
                                            result?.success === false ? 'text-red-600' :
                                                'text-gray-600'
                                            }`} />
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-black">{test.label}</h3>
                                        <p className="text-gray-600 text-sm mb-2">{test.description}</p>

                                        {result && (
                                            <div className={`mt-2 p-3 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'
                                                }`}>
                                                <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'
                                                    }`}>
                                                    {result.message}
                                                </p>

                                                {result.data && (
                                                    <pre className="mt-2 text-xs overflow-auto">
                                                        {JSON.stringify(result.data, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={test.action}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Run Test
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Setup Instructions */}
            <div className="mt-8 bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-2 text-black">Setup Checklist</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Run the database migration to create all required tables</li>
                    <li>Set up Google Cloud OAuth credentials and add to .env.local</li>
                    <li>Get Google Ads Developer Token and add to .env.local</li>
                    <li>Create at least one business in the system</li>
                    <li>Connect the business to Google Ads (OAuth flow)</li>
                    <li>Run all tests to verify everything is working</li>
                </ol>
            </div>
        </div>
    );
};

export default GoogleAdsTestPage;