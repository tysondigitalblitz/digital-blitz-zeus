'use client';

import { useState, useEffect } from 'react';
import { Download, Upload, RefreshCw, AlertCircle, Check } from 'lucide-react';
import type { OfflineConversion } from '@/lib/types/google';

const GoogleAdsConversionDashboard = () => {
    const [conversions, setConversions] = useState<OfflineConversion[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        clientId: ''
    });
    const [uploadStatus, setUploadStatus] = useState<'uploading' | 'success' | 'error' | null>(null);

    // Fetch and transform conversions
    const fetchConversions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`/api/google-ads/transform-conversions?${params}`);
            const data = await response.json();
            setConversions(data.conversions || []);
        } catch (error) {
            console.error('Error fetching conversions:', error);
        }
        setLoading(false);
    };

    // Download CSV
    const downloadCSV = async () => {
        try {
            const response = await fetch('/api/google-ads/transform-conversions/csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversions: conversions.map(c => ({
                        gclid: c.gclid,
                        conversionAction: c.conversionAction,
                        conversionDateTime: c.conversionDateTime,
                        conversionValue: c.conversionValue,
                        conversionCurrency: c.conversionCurrency
                    }))
                })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `google-ads-conversions-${Date.now()}.csv`;
            a.click();
        } catch (error) {
            console.error('Error downloading CSV:', error);
        }
    };

    // Upload via API
    const uploadToGoogleAds = async () => {
        setUploadStatus('uploading');
        try {
            const response = await fetch('/api/google-ads/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversions,
                    customerId: 'YOUR_CUSTOMER_ID', // Replace with actual
                    conversionActionId: 'YOUR_CONVERSION_ACTION_ID' // Replace with actual
                })
            });

            const result = await response.json();
            if (result.success) {
                setUploadStatus('success');
            } else {
                setUploadStatus('error');
            }
        } catch (error) {
            console.error('Error uploading:', error);
            setUploadStatus('error');
        }
    };

    useEffect(() => {
        fetchConversions();
    }, []);

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-6">Google Ads Offline Conversions</h1>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Client ID</label>
                        <input
                            type="text"
                            value={filters.clientId}
                            onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                            className="w-full p-2 border rounded-lg"
                            placeholder="Optional"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={fetchConversions}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                                'Fetch Conversions'
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-black">Total Conversions</p>
                        <p className="text-2xl font-bold text-black">{conversions.length}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-black">Total Value</p>
                        <p className="text-2xl font-bold text-black">
                            ${conversions.reduce((sum, c) => sum + (c.conversionValue || 0), 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-black">With Email</p>
                        <p className="text-2xl font-bold text-black">
                            {conversions.filter(c => c.hashedEmail).length}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-black">With Phone</p>
                        <p className="text-2xl font-bold text-black">
                            {conversions.filter(c => c.hashedPhoneNumber).length}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={downloadCSV}
                        disabled={conversions.length === 0}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                    </button>
                    <button
                        onClick={uploadToGoogleAds}
                        disabled={conversions.length === 0}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload via API
                    </button>
                </div>

                {/* Upload Status */}
                {uploadStatus && (
                    <div className={`p-4 rounded-lg mb-6 ${uploadStatus === 'success' ? 'bg-green-100 text-green-800' :
                        uploadStatus === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                        <div className="flex items-center">
                            {uploadStatus === 'uploading' && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                            {uploadStatus === 'success' && <Check className="w-4 h-4 mr-2" />}
                            {uploadStatus === 'error' && <AlertCircle className="w-4 h-4 mr-2" />}
                            <span>
                                {uploadStatus === 'uploading' && 'Uploading conversions...'}
                                {uploadStatus === 'success' && 'Conversions uploaded successfully!'}
                                {uploadStatus === 'error' && 'Error uploading conversions. Please try again.'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Conversions Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-2 text-black">GCLID</th>
                                <th className="text-left p-2 text-black">Date/Time</th>
                                <th className="text-right p-2 text-black">Value</th>
                                <th className="text-center p-2 text-black">Email</th>
                                <th className="text-center p-2 text-black">Phone</th>
                                <th className="text-left p-2 text-black">Client ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conversions.slice(0, 50).map((conv, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-2 font-mono text-sm">{conv.gclid}</td>
                                    <td className="p-2 text-sm">{new Date(conv.conversionDateTime).toLocaleString()}</td>
                                    <td className="p-2 text-right">${conv.conversionValue?.toFixed(2)}</td>
                                    <td className="p-2 text-center">
                                        {conv.hashedEmail ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : '-'}
                                    </td>
                                    <td className="p-2 text-center">
                                        {conv.hashedPhoneNumber ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : '-'}
                                    </td>
                                    <td className="p-2 text-sm">{conv.conversionActionId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {conversions.length > 50 && (
                        <p className="text-sm text-black mt-2">Showing first 50 of {conversions.length} conversions</p>
                    )}
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2 text-black">Upload Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-black">
                        <li>Filter conversions by date range if needed</li>
                        <li>Review the conversions in the table</li>
                        <li>Download CSV for manual upload to Google Ads, or</li>
                        <li>Use Upload via API for automated upload (requires API setup)</li>
                        <li>Check Google Ads Conversions page to verify upload</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default GoogleAdsConversionDashboard;