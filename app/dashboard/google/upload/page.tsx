'use client';
import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Info, BarChart3, RefreshCw, Eye, X } from 'lucide-react';
interface UploadResult {
    success: boolean;
    error?: string;
    uploaded?: number;
    processed?: number;
    matched?: number;
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
}
interface RecentUpload {
    id: string;
    created_at: string;
    file_name?: string;
    total_records: number;
    matched_records: number;
    platform: string;
}
const ConversionUploadPage = () => {
    const [platform, setPlatform] = useState<'google' | 'meta'>('google');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [csvPreview, setCsvPreview] = useState<string[][]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [manualEntry, setManualEntry] = useState({
        email: '',
        phone: '',
        firstName: '',
        lastName: '',
        city: '',
        state: '',
        zipCode: '',
        purchaseAmount: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        orderId: ''
    });
    // Fetch recent uploads
    useEffect(() => {
        fetchRecentUploads();
    }, [platform]);

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
        if (!file || validationErrors.length > 0) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

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

    // Manual entry
    const handleManualSubmit = async () => {
        setUploading(true);
        try {
            const endpoint = platform === 'google'
                ? '/api/google/conversions/upload'
                : '/api/meta/conversions/upload';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversions: [{
                        ...manualEntry,
                        purchaseAmount: parseFloat(manualEntry.purchaseAmount),
                        orderId: manualEntry.orderId || `${platform.toUpperCase()}-MANUAL-${Date.now()}`
                    }]
                })
            });
            const result = await response.json();
            setUploadResult(result);

            if (result.success) {
                setManualEntry({
                    email: '',
                    phone: '',
                    firstName: '',
                    lastName: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    purchaseAmount: '',
                    purchaseDate: new Date().toISOString().split('T')[0],
                    orderId: ''
                });
                fetchRecentUploads();
            }
        } catch (error) {
            console.error('Submit error:', error);
            setUploadResult({
                success: false,
                error: 'Submit failed. Please try again.'
            });
        }
        setUploading(false);
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-black">Upload Offline Conversions</h1>
                <p className="text-black">Import your offline sales data to match with online ad clicks</p>
            </div>

            {/* Platform Selector */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 text-black">Select Platform</h2>
                <div className="flex gap-4">
                    <button
                        onClick={() => setPlatform('google')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${platform === 'google'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-black hover:bg-gray-200'
                            }`}
                    >
                        Google Ads
                    </button>
                    <button
                        onClick={() => setPlatform('meta')}
                        disabled
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${platform === 'meta'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Meta Ads (Coming Soon)
                    </button>
                </div>
            </div>

            {/* Upload Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* CSV Upload */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-black">Bulk CSV Upload</h3>
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
                        />
                        <label
                            htmlFor="csv-upload"
                            className="cursor-pointer block"
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
                                    <p className="text-black">Drop your CSV here or click to browse</p>
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
                                    onClick={() => setShowPreview(false)}
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
                        disabled={!file || uploading || validationErrors.length > 0}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {uploading ? 'Uploading...' : 'Upload CSV'}
                    </button>
                </div>

                {/* Manual Entry */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-black">Manual Entry</h3>
                        <FileText className="w-6 h-6 text-green-600" />
                    </div>

                    <p className="text-black mb-4">Add individual conversions one at a time</p>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">Email</label>
                                <input
                                    type="email"
                                    placeholder="customer@example.com"
                                    value={manualEntry.email}
                                    onChange={(e) => setManualEntry({ ...manualEntry, email: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">Phone</label>
                                <input
                                    type="tel"
                                    placeholder="555-1234"
                                    value={manualEntry.phone}
                                    onChange={(e) => setManualEntry({ ...manualEntry, phone: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">First Name</label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    value={manualEntry.firstName}
                                    onChange={(e) => setManualEntry({ ...manualEntry, firstName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">Last Name</label>
                                <input
                                    type="text"
                                    placeholder="Doe"
                                    value={manualEntry.lastName}
                                    onChange={(e) => setManualEntry({ ...manualEntry, lastName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">City</label>
                                <input
                                    type="text"
                                    placeholder="New York"
                                    value={manualEntry.city}
                                    onChange={(e) => setManualEntry({ ...manualEntry, city: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">State</label>
                                <input
                                    type="text"
                                    placeholder="NY"
                                    maxLength={2}
                                    value={manualEntry.state}
                                    onChange={(e) => setManualEntry({ ...manualEntry, state: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">ZIP Code</label>
                                <input
                                    type="text"
                                    placeholder="10001"
                                    value={manualEntry.zipCode}
                                    onChange={(e) => setManualEntry({ ...manualEntry, zipCode: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">
                                    Purchase Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="150.00"
                                    value={manualEntry.purchaseAmount}
                                    onChange={(e) => setManualEntry({ ...manualEntry, purchaseAmount: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-black mb-1 block">
                                    Purchase Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={manualEntry.purchaseDate}
                                    onChange={(e) => setManualEntry({ ...manualEntry, purchaseDate: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-black mb-1 block">Order ID</label>
                            <input
                                type="text"
                                placeholder="ORDER-12345 (optional)"
                                value={manualEntry.orderId}
                                onChange={(e) => setManualEntry({ ...manualEntry, orderId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                            <div className="flex items-start gap-2">
                                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-black">
                                    <p className="font-medium">Matching Requirements:</p>
                                    <ul className="list-disc list-inside mt-1 text-gray-700">
                                        <li>Provide at least email OR phone</li>
                                        <li>Location data improves match rate</li>
                                        <li>Purchase date must be recent (within 90 days)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleManualSubmit}
                            disabled={!manualEntry.purchaseAmount || uploading || (!manualEntry.email && !manualEntry.phone)}
                            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mt-4"
                        >
                            {uploading ? 'Processing...' : 'Add Conversion'}
                        </button>
                    </div>
                </div>
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
                                <div className="bg-gray-50 rounded-lg p-4">
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

                            {uploadResult.details && uploadResult.details.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2 text-black">Detailed Results</h4>
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-black">Order ID</th>
                                                    <th className="px-3 py-2 text-left text-black">Match Type</th>
                                                    <th className="px-3 py-2 text-left text-black">Confidence</th>
                                                    <th className="px-3 py-2 text-left text-black">GCLID</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {uploadResult.details.map((detail, i) => (
                                                    <tr key={i} className="border-b">
                                                        <td className="px-3 py-2 text-black">{detail.orderId}</td>
                                                        <td className="px-3 py-2">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${detail.matchType === 'exact' ? 'bg-green-100 text-green-800' :
                                                                detail.matchType === 'probable' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {detail.matchType}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-black">{detail.confidence}%</td>
                                                        <td className="px-3 py-2 text-black font-mono text-xs">
                                                            {detail.matchedGclid ? detail.matchedGclid.substring(0, 20) + '...' : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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