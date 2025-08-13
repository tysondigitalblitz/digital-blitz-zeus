/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import {
    Upload,
    Download,
    CheckCircle,
    AlertCircle,
    FileText,
    Info,
    X,
    Loader2,
    FileSpreadsheet,
    Zap,
    BarChart3,
    Building2
} from 'lucide-react';

// CSV Template with all Google Ads supported fields
const CSV_TEMPLATE_HEADERS = [
    'email', 'phone', 'first_name', 'last_name',
    'street_address', 'city', 'state', 'postal_code', 'country',
    'purchase_amount', 'purchase_date', 'order_id'
].join(',');

const CSV_TEMPLATE_ROWS = [
    'john.doe@gmail.com,555-0123,John,Doe,123 Main St,New York,NY,10001,US,150.00,2025-01-28,ORDER-001',
    'jane.smith@gmail.com,555-0124,Jane,Smith,456 Oak Ave,Los Angeles,CA,90001,US,200.00,2025-01-28,ORDER-002',
    'bob@example.com,555-0125,Bob,Wilson,789 Pine St,Chicago,IL,60601,US,75.50,2025-01-28,ORDER-003'
];

const CSV_TEMPLATE = [CSV_TEMPLATE_HEADERS, ...CSV_TEMPLATE_ROWS].join('\n');

interface MatchStats {
    total: number;
    gclid_matched: number;
    enhanced_only: number;
    no_match: number;
}

interface Business {
    id: string;
    name: string;
    pixel_id?: string;
}

export default function EnhanceConversionsPage() {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [enhancedFile, setEnhancedFile] = useState<File | null>(null);
    const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [enhancedPreviewData, setEnhancedPreviewData] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);

    // Load businesses on mount
    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const response = await fetch('/api/businesses');
            const data = await response.json();
            setBusinesses(data.businesses || []);

            if (data.businesses?.length === 1) {
                setSelectedBusiness(data.businesses[0].id);
            }
        } catch (error) {
            console.error('Error fetching businesses:', error);
            setError('Failed to load businesses');
        }
    };

    // Download template CSV
    const downloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'google_ads_conversion_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Parse CSV for preview
    const parseCSVPreview = async (file: File, limit = 5) => {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1, limit + 1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
            }, {} as any);
        });
        return { headers, rows, total: lines.length - 1 };
    };

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Reset previous results
            setEnhancedFile(null);
            setMatchStats(null);
            setEnhancedPreviewData([]);
            setSuccess(null);

            setOriginalFile(file);
            setError(null);
            const { rows, total } = await parseCSVPreview(file);
            setPreviewData(rows);
            setTotalRows(total);
            setShowPreview(true);
        }
    };

    const handleEnhanceCSV = async () => {
        if (!originalFile || !selectedBusiness) {
            setError('Please select a file and business');
            return;
        }

        setIsEnhancing(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('file', originalFile);
        formData.append('businessId', selectedBusiness);
        // Remove these lines - not needed:
        // formData.append('conversionActionId', selectedConversionAction);
        // formData.append('conversionActionName', action?.conversion_action_name || 'Offline Purchase');

        try {
            const response = await fetch('/api/google/conversions/enhance', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const statsHeader = response.headers.get('X-Match-Stats');
                if (statsHeader) {
                    setMatchStats(JSON.parse(statsHeader));
                }

                const blob = await response.blob();
                const enhancedFileName = `enhanced_${originalFile.name}`;
                const file = new File([blob], enhancedFileName, { type: 'text/csv' });
                setEnhancedFile(file);

                // Parse enhanced file for preview
                const text = await file.text();
                const { rows } = await parseCSVPreview(new File([text], enhancedFileName));
                setEnhancedPreviewData(rows);

                // Auto-download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = enhancedFileName;
                a.click();
                URL.revokeObjectURL(url);

                setSuccess(`Enhanced CSV downloaded! ${statsHeader ? `Found ${JSON.parse(statsHeader).gclid_matched} GCLID matches.` : ''}`);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Enhancement failed');
            }
        } catch (error) {
            console.error('Enhancement failed:', error);
            setError('Failed to enhance CSV. Please try again.');
        } finally {
            setIsEnhancing(false);
        }
    };
    // Download enhanced file again
    const downloadEnhancedFile = () => {
        if (!enhancedFile) return;

        const url = URL.createObjectURL(enhancedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = enhancedFile.name;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-gray-900">Enhance Conversions for Google Ads</h1>
                <p className="text-gray-600">
                    Match your offline conversions with Google Click IDs and prepare data for Google Ads upload
                </p>
            </div>

            {/* Configuration */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Select Business
                </h2>

                <div className="max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business *
                    </label>
                    <select
                        value={selectedBusiness}
                        onChange={(e) => setSelectedBusiness(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Select a business...</option>
                        {businesses.map(business => (
                            <option key={business.id} value={business.id}>
                                {business.name}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-sm text-gray-500">
                        Select the business to match conversions with its pixel tracking data
                    </p>
                </div>
            </div>

            {/* CSV Upload */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    Upload CSV for Enhancement
                </h3>

                <div className="mb-4">
                    <button
                        onClick={downloadTemplate}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV Template
                    </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="csv-upload"
                        disabled={!selectedBusiness}
                    />
                    <label
                        htmlFor="csv-upload"
                        className={`cursor-pointer ${!selectedBusiness ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {originalFile ? (
                            <div>
                                <FileText className="w-12 h-12 text-green-600 mx-auto mb-2" />
                                <p className="font-medium text-gray-900">{originalFile.name}</p>
                                <p className="text-sm text-gray-500">
                                    {(originalFile.size / 1024).toFixed(2)} KB • {totalRows} rows
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    Click to choose a different file
                                </p>
                            </div>
                        ) : (
                            <div>
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-700">
                                    Drop your CSV here or click to browse
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {!selectedBusiness ? 'Select a business first' : 'Max file size: 10MB'}
                                </p>
                            </div>
                        )}
                    </label>
                </div>

                {/* CSV Preview */}
                {showPreview && previewData.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">Preview (first 5 rows of {totalRows})</h4>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {Object.keys(previewData[0]).map(header => (
                                            <th key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {previewData.map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((cell: any, j) => (
                                                <td key={j} className="px-3 py-2 text-gray-900">
                                                    {cell || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleEnhanceCSV}
                        disabled={!originalFile || !selectedBusiness || isEnhancing}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isEnhancing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enhancing...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4 mr-2" />
                                Enhance CSV
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Enhancement Results */}
            {matchStats && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Enhancement Results
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900">{matchStats.total}</p>
                            <p className="text-sm text-gray-600">Total Records</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{matchStats.gclid_matched}</p>
                            <p className="text-sm text-gray-600">GCLID Matched</p>
                            <p className="text-xs text-green-600 mt-1">
                                {matchStats.total > 0 ? Math.round((matchStats.gclid_matched / matchStats.total) * 100) : 0}%
                            </p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-yellow-600">{matchStats.enhanced_only}</p>
                            <p className="text-sm text-gray-600">Enhanced Only</p>
                            <p className="text-xs text-yellow-600 mt-1">
                                {matchStats.total > 0 ? Math.round((matchStats.enhanced_only / matchStats.total) * 100) : 0}%
                            </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">{matchStats.no_match}</p>
                            <p className="text-sm text-gray-600">No Match</p>
                            <p className="text-xs text-red-600 mt-1">
                                {matchStats.total > 0 ? Math.round((matchStats.no_match / matchStats.total) * 100) : 0}%
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">What do these results mean?</p>
                                <ul className="space-y-1">
                                    <li><strong>GCLID Matched:</strong> Found Google Click ID from pixel tracking - best attribution (100% accuracy)</li>
                                    <li><strong>Enhanced Only:</strong> No GCLID found, but have customer data for enhanced conversions</li>
                                    <li><strong>No Match:</strong> No pixel data found - will rely solely on customer data matching</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Data Preview */}
                    {enhancedPreviewData.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Enhanced Data Sample</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {['Google Click ID', 'Match Type', 'Match Confidence', 'Email', 'Phone'].map(header => (
                                                <th key={header} className="px-3 py-2 text-left font-medium text-gray-500 uppercase">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {enhancedPreviewData.slice(0, 3).map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 text-gray-900">
                                                    {row['Google Click ID'] || '-'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${row['Match Type'] === 'gclid_match' ? 'bg-green-100 text-green-800' :
                                                        row['Match Type'] === 'enhanced_only' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {row['Match Type'] || 'no_match'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-900">
                                                    {row['Match Confidence'] || '0'}%
                                                </td>
                                                <td className="px-3 py-2 text-gray-900">
                                                    {row['Email'] ? '••••' + row['Email'].slice(-10) : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-gray-900">
                                                    {row['Phone'] ? '••••' + row['Phone'].slice(-4) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {enhancedFile && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={downloadEnhancedFile}
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Enhanced CSV Again
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Info Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">How to use the enhanced CSV:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Review the enhanced CSV file that was automatically downloaded</li>
                    <li>Check the Match Type and Match Confidence columns to understand attribution quality</li>
                    <li>The file includes all Google Ads required fields (properly formatted)</li>
                    <li>Upload the enhanced CSV to Google Ads or use the regular upload page for auto-sync</li>
                </ol>
                <div className="mt-4 p-3 bg-white rounded border border-gray-300">
                    <p className="text-xs text-gray-600">
                        <strong>Enhanced fields include:</strong> Google Click ID, Conversion Name, Conversion Time,
                        Hashed Email/Phone/Names, Match Type, Match Confidence, and all original data
                    </p>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">{error}</div>
                </div>
            )}

            {success && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800">{success}</div>
                </div>
            )}
        </div>
    );
}