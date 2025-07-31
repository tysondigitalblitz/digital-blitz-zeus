'use client';
import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, RefreshCw, X, Building2, Send } from 'lucide-react';

interface UploadResult {
    success: boolean;
    error?: string;
    uploaded?: number;
    processed?: number;
    matched?: number;
    batchId?: string;
    summary?: {
        exactMatches: number;
        probableMatches: number;
        statisticalMatches: number;
        averageConfidence: number;
    };
    details?: Array<{
        orderId: string;
        email?: string;
        matchType: string;
        confidence: number;
        matchedGclid?: string;
        error?: string;
    }>;
    googleSync?: {
        success: boolean;
        uploaded?: number;
        error?: string;
    };
}

interface RecentUpload {
    id: string;
    created_at: string;
    file_name?: string;
    total_records: number;
    matched_records: number;
    platform: string;
}

interface Business {
    id: string;
    name: string;
    description?: string;
    pixel_id?: string;
    google_ads_accounts?: GoogleAdsAccount[];
}

interface GoogleAdsAccount {
    id: string;
    customer_id: string;
    account_name: string;
    conversion_actions?: ConversionAction[];
}

interface ConversionAction {
    id: string;
    conversion_action_id: string;
    conversion_action_name: string;
    status: string;
}

const ConversionUploadPage = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [platform, setPlatform] = useState<'google' | 'meta'>('google');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [csvPreview, setCsvPreview] = useState<string[][]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [syncing, setSyncing] = useState(false);

    // Business & Account Selection
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedConversionAction, setSelectedConversionAction] = useState('');
    const [googleAdsAccounts, setGoogleAdsAccounts] = useState<GoogleAdsAccount[]>([]);
    const [autoSync, setAutoSync] = useState(false);

    // Fetch businesses on mount
    useEffect(() => {
        fetchBusinesses();
        fetchRecentUploads();
    }, []);

    // Update accounts when business changes
    useEffect(() => {
        if (selectedBusiness) {
            const business = businesses.find(b => b.id === selectedBusiness);
            setGoogleAdsAccounts(business?.google_ads_accounts || []);
            setSelectedAccount('');
            setSelectedConversionAction('');
        }
    }, [selectedBusiness, businesses]);

    // Update conversion actions when account changes
    useEffect(() => {
        if (selectedAccount) {
            const account = googleAdsAccounts.find(a => a.id === selectedAccount);
            if (account?.conversion_actions && account.conversion_actions.length > 0) {
                // Auto-select first active conversion action
                const activeAction = account.conversion_actions.find(ca => ca.status === 'ENABLED');
                if (activeAction) {
                    setSelectedConversionAction(activeAction.conversion_action_id);
                }
            }
        }
    }, [selectedAccount, googleAdsAccounts]);

    const fetchBusinesses = async () => {
        try {
            const response = await fetch('/api/businesses');
            const data = await response.json();
            setBusinesses(data.businesses || []);

            // Auto-select first business if only one exists
            if (data.businesses?.length === 1) {
                setSelectedBusiness(data.businesses[0].id);
            }
        } catch (error) {
            console.error('Error fetching businesses:', error);
        }
    };

    const fetchRecentUploads = async () => {
        try {
            const response = await fetch(`/api/${platform}/conversions/recent`);
            if (response.ok) {
                const data = await response.json();
                setRecentUploads(data.uploads || []);
            }
        } catch (error) {
            console.error('Error fetching recent uploads:', error);
        }
    };

    // Download sample CSV
    const downloadSampleCSV = () => {
        const sampleData = `email,phone,first_name,last_name,city,state,zip_code,purchase_amount,purchase_date,order_id
john@example.com,555-1234,John,Doe,New York,NY,10001,150.00,2024-01-15,ORDER-001
jane@example.com,555-5678,Jane,Smith,Los Angeles,CA,90001,200.00,2024-01-16,ORDER-002
,555-9012,,Wilson,Chicago,IL,60601,75.00,2024-01-17,ORDER-003`;
        const blob = new Blob([sampleData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sample_${platform}_conversions.csv`;
        a.click();
    };

    // Preview CSV file
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setValidationErrors([]);

        // Read and preview file
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            const preview = lines.slice(0, 6).map(line => line.split(','));
            setCsvPreview(preview);
            setShowPreview(true);

            // Validate CSV
            validateCSV(preview);
        };
        reader.readAsText(selectedFile);
    };

    // Validate CSV structure
    const validateCSV = (data: string[][]) => {
        const errors: string[] = [];
        const headers = data[0];
        const requiredFields = ['purchase_amount', 'purchase_date'];
        const identifierFields = ['email', 'phone'];

        // Check required fields
        requiredFields.forEach(field => {
            if (!headers.includes(field)) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        // Check for at least one identifier
        const hasIdentifier = identifierFields.some(field => headers.includes(field));
        if (!hasIdentifier) {
            errors.push('CSV must include at least one identifier field (email or phone)');
        }

        // Check data rows
        if (data.length < 2) {
            errors.push('CSV must contain at least one data row');
        }

        setValidationErrors(errors);
    };

    // Upload CSV
    const handleCSVUpload = async () => {
        if (!file || validationErrors.length > 0 || !selectedBusiness) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('businessId', selectedBusiness);

        if (selectedAccount) {
            formData.append('googleAdsAccountId', selectedAccount);
        }

        formData.append('autoSync', autoSync.toString());

        try {
            const endpoint = platform === 'google'
                ? '/api/google/conversions/upload'
                : '/api/meta/conversions/upload';

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            setUploadResult(result);

            if (result.success) {
                fetchRecentUploads();
                setFile(null);
                setShowPreview(false);
                setCsvPreview([]);

                // Reset file input
                const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            }
        } catch (error) {
            console.error('Upload error:', error);
            setUploadResult({
                success: false,
                error: 'Upload failed. Please try again.'
            });
        }
        setUploading(false);
    };

    // Sync to Google Ads
    const syncToGoogleAds = async () => {
        if (!uploadResult?.batchId || !selectedAccount || !selectedConversionAction) return;

        setSyncing(true);
        try {
            const account = googleAdsAccounts.find(a => a.id === selectedAccount);
            if (!account) throw new Error('Account not found');

            const response = await fetch('/api/google-ads/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchId: uploadResult.batchId,
                    customerId: account.customer_id.replace(/-/g, ''), // Remove dashes
                    conversionActionId: selectedConversionAction,
                    conversions: uploadResult.details?.filter(d => d.matchedGclid).map(d => ({
                        gclid: d.matchedGclid,
                        conversionDateTime: new Date().toISOString(),
                        conversionValue: 0, // You might want to include this from the upload
                        orderId: d.orderId
                    }))
                })
            });

            const result = await response.json();

            if (result.success) {
                alert(`Successfully synced ${result.totalUploaded} conversions to Google Ads!`);
                setUploadResult({ ...uploadResult, googleSync: result });
            } else {
                alert(`Sync failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('Failed to sync to Google Ads');
        }
        setSyncing(false);
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-black">Upload Offline Conversions</h1>
                <p className="text-black">Import your offline sales data to match with online ad clicks</p>
            </div>

            {/* Business & Account Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 text-black flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    Business & Platform Settings
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-black">Business</label>
                        <select
                            value={selectedBusiness}
                            onChange={(e) => setSelectedBusiness(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-black bg-white"
                        >
                            <option value="">Select a business...</option>
                            {businesses.map(business => (
                                <option key={business.id} value={business.id}>
                                    {business.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-black">Google Ads Account</label>
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-black bg-white"
                            disabled={!selectedBusiness || googleAdsAccounts.length === 0}
                        >
                            <option value="">
                                {!selectedBusiness ? 'Select a business first' :
                                    googleAdsAccounts.length === 0 ? 'No accounts connected' :
                                        'Select account (optional)'}
                            </option>
                            {googleAdsAccounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.account_name} ({account.customer_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-black">Conversion Action</label>
                        <select
                            value={selectedConversionAction}
                            onChange={(e) => setSelectedConversionAction(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-black bg-white"
                            disabled={!selectedAccount}
                        >
                            <option value="">
                                {!selectedAccount ? 'Select account first' : 'Select conversion action'}
                            </option>
                            {selectedAccount && googleAdsAccounts
                                .find(a => a.id === selectedAccount)
                                ?.conversion_actions
                                ?.filter(ca => ca.status === 'ENABLED')
                                .map(action => (
                                    <option key={action.id} value={action.conversion_action_id}>
                                        {action.conversion_action_name}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                {selectedBusiness && googleAdsAccounts.length === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            No Google Ads accounts connected. Go to Settings to connect Google Ads.
                        </p>
                    </div>
                )}

                {selectedAccount && (
                    <div className="mt-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={autoSync}
                                onChange={(e) => setAutoSync(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-black">
                                Automatically sync matched conversions to Google Ads after upload
                            </span>
                        </label>
                    </div>
                )}
            </div>

            {/* CSV Upload */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-black">CSV Upload</h3>
                    <Upload className="w-6 h-6 text-blue-600" />
                </div>

                <p className="text-black mb-4">Upload multiple conversions at once using a CSV file</p>

                <button
                    onClick={downloadSampleCSV}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                >
                    <Download className="w-4 h-4" />
                    Download Sample CSV
                </button>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                        id="csv-upload"
                        disabled={!selectedBusiness}
                    />
                    <label
                        htmlFor="csv-upload"
                        className={`cursor-pointer block ${!selectedBusiness ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {file ? (
                            <div>
                                <FileText className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                                <p className="text-black font-medium">{file.name}</p>
                                <p className="text-sm text-gray-600">
                                    {(file.size / 1024).toFixed(2)} KB
                                </p>
                            </div>
                        ) : (
                            <div>
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-black">
                                    {selectedBusiness ?
                                        'Drop your CSV here or click to browse' :
                                        'Select a business first'}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">Max file size: 10MB</p>
                            </div>
                        )}
                    </label>
                </div>

                {/* CSV Preview */}
                {showPreview && csvPreview.length > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-black">Preview</h4>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setCsvPreview([]);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="text-xs border rounded">
                                <tbody>
                                    {csvPreview.slice(0, 5).map((row, i) => (
                                        <tr key={i} className={i === 0 ? 'bg-gray-100 font-medium' : ''}>
                                            {row.map((cell, j) => (
                                                <td key={j} className="border px-2 py-1 text-black">
                                                    {cell || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {csvPreview.length > 5 && (
                                <p className="text-sm text-gray-600 mt-1">
                                    ... and {csvPreview.length - 5} more rows
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="font-medium text-red-800 mb-1">Validation Errors:</p>
                        <ul className="text-sm text-red-700 list-disc list-inside">
                            {validationErrors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <button
                    onClick={handleCSVUpload}
                    disabled={!file || uploading || validationErrors.length > 0 || !selectedBusiness}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {uploading ? 'Uploading...' : 'Upload & Process'}
                </button>
            </div>

            {/* Upload Results */}
            {uploadResult && (
                <div className={`bg-white rounded-lg shadow-lg p-6 mb-6 ${uploadResult.error ? 'border-2 border-red-500' : ''
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            {uploadResult.error ? (
                                <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
                            ) : (
                                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                            )}
                            <h3 className="text-lg font-semibold text-black">
                                {uploadResult.error ? 'Upload Failed' : 'Upload Complete'}
                            </h3>
                        </div>
                        <button
                            onClick={() => setUploadResult(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {uploadResult.error ? (
                        <p className="text-red-600">{uploadResult.error}</p>
                    ) : (
                        <div>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <p className="text-3xl font-bold text-black">{uploadResult.uploaded}</p>
                                    <p className="text-sm text-gray-600">Uploaded</p>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <p className="text-3xl font-bold text-blue-600">{uploadResult.processed}</p>
                                    <p className="text-sm text-gray-600">Processed</p>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <p className="text-3xl font-bold text-green-600">{uploadResult.matched}</p>
                                    <p className="text-sm text-gray-600">Matched</p>
                                </div>
                            </div>

                            {uploadResult.summary && (
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <h4 className="font-semibold mb-3 text-black">Match Breakdown</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-black">Exact Matches (Email/Phone)</span>
                                            <span className="font-bold text-green-600">{uploadResult.summary.exactMatches}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-black">Probable Matches (Location + Time)</span>
                                            <span className="font-bold text-blue-600">{uploadResult.summary.probableMatches}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-black">Statistical Attribution</span>
                                            <span className="font-bold text-gray-600">{uploadResult.summary.statisticalMatches}</span>
                                        </div>
                                        <div className="pt-2 border-t">
                                            <div className="flex justify-between items-center">
                                                <span className="text-black font-medium">Average Confidence</span>
                                                <span className="font-bold text-black">{uploadResult.summary.averageConfidence}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sync to Google Ads Button */}
                            {selectedAccount && selectedConversionAction && !uploadResult.googleSync && (uploadResult.matched ?? 0) > 0 && (
                                <button
                                    onClick={syncToGoogleAds}
                                    disabled={syncing}
                                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                                >
                                    <Send className="w-5 h-5" />
                                    {syncing ? 'Syncing to Google Ads...' : `Sync ${uploadResult.matched} Matched Conversions to Google Ads`}
                                </button>
                            )}

                            {uploadResult.googleSync && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-green-800 font-medium">
                                        ✓ Successfully synced {uploadResult.googleSync.uploaded} conversions to Google Ads
                                    </p>
                                </div>
                            )}

                            {selectedAccount && !selectedConversionAction && (uploadResult.matched ?? 0) > 0 && (
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-yellow-800">
                                        Select a conversion action above to sync matched conversions to Google Ads
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Uploads */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-black">Recent Uploads</h3>
                    <button
                        onClick={fetchRecentUploads}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {recentUploads.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-black">Date</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-black">File Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-black">Total Records</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-black">Matched</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-black">Match Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {recentUploads.map((upload) => (
                                    <tr key={upload.id}>
                                        <td className="px-4 py-3 text-sm text-black">
                                            {new Date(upload.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-black">
                                            {upload.file_name || 'Manual Entry'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-black">
                                            {upload.total_records}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-black">
                                            {upload.matched_records}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs ${(upload.matched_records / upload.total_records) > 0.5
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {((upload.matched_records / upload.total_records) * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">No recent uploads</p>
                )}
            </div>
        </div>
    );
};

export default ConversionUploadPage;