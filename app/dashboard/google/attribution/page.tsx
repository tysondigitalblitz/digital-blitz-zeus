'use client';
import React, { useState } from 'react';
import { BarChart3, Users, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

type FormCapture = {
    email?: string;
    phone?: string;
    geo_city?: string;
    geo_state?: string;
    gclid?: string;
};

type FormDataStats = {
    emailCaptureRate?: number;
    phoneCaptureRate?: number;
    bothFieldsRate?: number;
};

type FormDataType = {
    recentCaptures?: FormCapture[];
    stats?: FormDataStats;
};

type MatchResults = {
    matchType: 'exact' | 'probable' | 'statistical';
    confidence: number;
    attributionMethod: string;
    gclid?: string;
    matchDetails: Record<string, unknown>;
};

type LocationStats = {
    topLocations?: { city: string; state: string; clicks: number }[];
    conversionRates?: { city: string; rate: number }[];
    attributionPotential?: { totalUnmatched: number };
    recommendations?: {
        topCity?: string;
        lowConversionCity?: string;
        highValueCity?: string;
    };
};

const AttributionDashboard = () => {
    const [testMode, setTestMode] = useState('formTest');
    const [formData, setFormData] = useState<FormDataType>({});
    const [matchResults, setMatchResults] = useState<MatchResults | null>(null);
    const [loading, setLoading] = useState(false);

    // Test form capture
    const testFormCapture = async () => {
        setLoading(true);
        try {
            // Check recent form captures
            const response = await fetch('/api/test/form-captures');
            const data = await response.json();
            setFormData(data);
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    // Test purchase matching
    const testPurchaseMatch = async () => {
        const testPurchase = {
            email: "test@example.com",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            purchaseAmount: 150.00,
            purchaseDate: new Date(),
            orderId: "TEST-001"
        };

        setLoading(true);
        try {
            const response = await fetch('/api/attribution/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchase: testPurchase })
            });
            const result = await response.json();
            setMatchResults(result);
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    // Location analysis
    const [locationStats, setLocationStats] = useState<LocationStats | null>(null);

    const analyzeLocations = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/analytics/location-performance');
            const data = await response.json();
            setLocationStats(data);
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8 text-white">Attribution Testing Dashboard</h1>

            {/* Tab Navigation */}
            <div className="flex space-x-4 mb-8">
                <button
                    onClick={() => setTestMode('formTest')}
                    className={`px-4 py-2 rounded-lg ${testMode === 'formTest'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-black'
                        }`}
                >
                    Form Capture Test
                </button>
                <button
                    onClick={() => setTestMode('matchTest')}
                    className={`px-4 py-2 rounded-lg ${testMode === 'matchTest'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-black'
                        }`}
                >
                    Purchase Matching
                </button>
                <button
                    onClick={() => setTestMode('analytics')}
                    className={`px-4 py-2 rounded-lg ${testMode === 'analytics'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-black'
                        }`}
                >
                    Location Analytics
                </button>
            </div>

            {/* Form Capture Test */}
            {testMode === 'formTest' && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-black">Form Capture Validation</h2>

                    <button
                        onClick={testFormCapture}
                        disabled={loading}
                        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Checking...' : 'Check Recent Form Captures'}
                    </button>

                    {formData.recentCaptures && (
                        <div>
                            <h3 className="font-semibold mb-2 text-black">Last 10 Form Captures:</h3>
                            <div className="space-y-2">
                                {formData.recentCaptures.map((capture, index) => (
                                    <div key={index} className="border rounded p-3">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="font-medium text-black">Email:</span>{' '}
                                                {capture.email || <span className="text-red-500">Missing</span>}
                                            </div>
                                            <div>
                                                <span className="font-medium text-black">Phone:</span>{' '}
                                                {capture.phone || <span className="text-red-500">Missing</span>}
                                            </div>
                                            <div>
                                                <span className="font-medium text-black">Location:</span>{' '}
                                                {capture.geo_city}, {capture.geo_state}
                                            </div>
                                            <div>
                                                <span className="font-medium text-black">GCLID:</span>{' '}
                                                {capture.gclid ? '✓' : '✗'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-semibold mb-2">Capture Rate Analysis:</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-black">Email Capture Rate</p>
                                        <p className="text-2xl font-bold">
                                            {formData.stats?.emailCaptureRate || 0}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-black">Phone Capture Rate</p>
                                        <p className="text-2xl font-bold">
                                            {formData.stats?.phoneCaptureRate || 0}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-black">Both Fields</p>
                                        <p className="text-2xl font-bold">
                                            {formData.stats?.bothFieldsRate || 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Purchase Matching Test */}
            {testMode === 'matchTest' && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Purchase Matching Engine</h2>

                    <div className="mb-6 p-4 bg-black rounded-lg">
                        <h3 className="font-semibold mb-2">Test Purchase Data:</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Email: test@example.com</div>
                            <div>City: New York, NY</div>
                            <div>ZIP: 10001</div>
                            <div>Amount: $150.00</div>
                        </div>
                    </div>

                    <button
                        onClick={testPurchaseMatch}
                        disabled={loading}
                        className="mb-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Matching...' : 'Run Match Test'}
                    </button>

                    {matchResults && (
                        <div>
                            <div className={`p-4 rounded-lg mb-4 ${matchResults.matchType === 'exact' ? 'bg-green-50' :
                                matchResults.matchType === 'probable' ? 'bg-yellow-50' :
                                    'bg-blue-50'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-lg">
                                        {matchResults.matchType === 'exact' ? 'Exact Match Found!' :
                                            matchResults.matchType === 'probable' ? 'Probable Match Found' :
                                                'Statistical Attribution'}
                                    </h3>
                                    <div className="flex items-center">
                                        {matchResults.matchType === 'exact' ?
                                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" /> :
                                            matchResults.matchType === 'probable' ?
                                                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" /> :
                                                <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
                                        }
                                        <span className="text-2xl font-bold">
                                            {matchResults.confidence}% Confidence
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">Attribution Method:</span>{' '}
                                        {matchResults.attributionMethod}
                                    </div>
                                    <div>
                                        <span className="font-medium">GCLID:</span>{' '}
                                        {matchResults.gclid || 'N/A'}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <h4 className="font-medium mb-1">Match Details:</h4>
                                    <pre className="text-xs bg-white p-2 rounded">
                                        {JSON.stringify(matchResults.matchDetails, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Location Analytics */}
            {testMode === 'analytics' && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-black">Location Performance Analytics</h2>

                    <button
                        onClick={analyzeLocations}
                        disabled={loading}
                        className="mb-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? 'Analyzing...' : 'Analyze Location Data'}
                    </button>

                    {locationStats && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-black p-4 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <MapPin className="w-5 h-5 text-black mr-2" />
                                        <h3 className="font-semibold">Top Locations</h3>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        {locationStats.topLocations?.map((loc, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>{loc.city}, {loc.state}</span>
                                                <span className="font-medium">{loc.clicks} clicks</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-black p-4 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <Users className="w-5 h-5 text-black mr-2" />
                                        <h3 className="font-semibold">Conversion Rates</h3>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        {locationStats.conversionRates?.map((loc, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>{loc.city}</span>
                                                <span className="font-medium">{loc.rate}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-black p-4 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <BarChart3 className="w-5 h-5 text-black mr-2" />
                                        <h3 className="font-semibold">Attribution Potential</h3>
                                    </div>
                                    <p className="text-2xl font-bold">
                                        {locationStats.attributionPotential?.totalUnmatched || 0}
                                    </p>
                                    <p className="text-sm text-black">
                                        Purchases awaiting attribution
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-yellow-50 rounded-lg">
                                <h4 className="font-semibold mb-2">Recommendations:</h4>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>Focus on collecting emails in {locationStats.recommendations?.topCity}</li>
                                    <li>
                                        {locationStats.recommendations?.lowConversionCity} has high traffic but low conversions
                                    </li>
                                    <li>
                                        Consider geo-targeted campaigns for {locationStats.recommendations?.highValueCity}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AttributionDashboard;