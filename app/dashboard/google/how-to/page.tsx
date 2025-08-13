/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    CheckCircle,
    Copy,
    Building2,
    Code,
    Upload,
    Zap,
    Link,
    FileSpreadsheet,
    Settings,
    Info,
    AlertCircle
} from 'lucide-react';

export default function SetupGuidePage() {
    const [expandedSections, setExpandedSections] = useState<string[]>(['google-ads-setup']);
    const [copiedCode, setCopiedCode] = useState(false);

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const pixelCode = `<script src="https://your-domain.com/pixel.js" data-client="YOUR_PIXEL_ID"></script>`;

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-gray-900">Complete Setup Guide</h1>
                <p className="text-gray-600">
                    Follow these steps to set up Enhanced Conversions tracking from start to finish
                </p>
            </div>

            {/* Progress Overview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h2 className="font-semibold text-blue-900 mb-3">Setup Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-blue-800">Google Ads Setup</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-blue-800">App Configuration</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-blue-800">Data Upload</span>
                    </div>
                </div>
            </div>

            {/* Step 1: Google Ads Setup */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
                <button
                    onClick={() => toggleSection('google-ads-setup')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-blue-600">1</span>
                        </div>
                        <Settings className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Set Up Conversion Actions in Google Ads</h2>
                    </div>
                    {expandedSections.includes('google-ads-setup') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {expandedSections.includes('google-ads-setup') && (
                    <div className="px-6 pb-6 border-t">
                        <div className="mt-4 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-yellow-800">
                                        You must complete this step in Google Ads before proceeding with the app setup.
                                    </p>
                                </div>
                            </div>

                            <ol className="space-y-4">
                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">1.1. Access Google Ads Conversion Settings</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Log in to your Google Ads account</li>
                                        <li>• Click <span className="font-mono bg-gray-100 px-1">Tools & Settings</span> (wrench icon)</li>
                                        <li>• Under "Measurement", click <span className="font-mono bg-gray-100 px-1">Conversions</span></li>
                                    </ul>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">1.2. Create a New Conversion Action</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Click the blue <span className="font-mono bg-gray-100 px-1">+ New conversion action</span> button</li>
                                        <li>• Select <span className="font-mono bg-gray-100 px-1">Import</span> as the conversion source</li>
                                        <li>• Choose <span className="font-mono bg-gray-100 px-1">Other data sources or CRMs</span></li>
                                        <li>• Select <span className="font-mono bg-gray-100 px-1">Track conversions from clicks</span></li>
                                    </ul>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">1.3. Configure Conversion Settings</h3>
                                    <div className="ml-4 space-y-3">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Recommended Settings:</p>
                                            <ul className="space-y-1 text-sm text-gray-600">
                                                <li><strong>Goal and action optimization:</strong> Purchase</li>
                                                <li><strong>Conversion name:</strong> "Offline Purchase - Enhanced"</li>
                                                <li><strong>Value:</strong> Use different values for each conversion</li>
                                                <li><strong>Count:</strong> Every conversion</li>
                                                <li><strong>Conversion window:</strong> 90 days (maximum)</li>
                                                <li><strong>Attribution model:</strong> Data-driven</li>
                                            </ul>
                                        </div>
                                    </div>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">1.4. Enable Enhanced Conversions</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• After creating the conversion action, click on it</li>
                                        <li>• Scroll to <span className="font-mono bg-gray-100 px-1">Enhanced conversions</span> section</li>
                                        <li>• Toggle <span className="font-mono bg-gray-100 px-1">Turn on enhanced conversions</span></li>
                                        <li>• Select <span className="font-mono bg-gray-100 px-1">API</span> as the implementation method</li>
                                        <li>• Click <span className="font-mono bg-gray-100 px-1">Save</span></li>
                                    </ul>
                                </li>
                            </ol>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800">
                                    <strong>✓ Checkpoint:</strong> You should now have a conversion action with Enhanced Conversions enabled in Google Ads.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2: Create Business */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
                <button
                    onClick={() => toggleSection('create-business')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-blue-600">2</span>
                        </div>
                        <Building2 className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Create a Business in the App</h2>
                    </div>
                    {expandedSections.includes('create-business') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {expandedSections.includes('create-business') && (
                    <div className="px-6 pb-6 border-t">
                        <div className="mt-4 space-y-4">
                            <ol className="space-y-4">
                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">2.1. Navigate to Business Management</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Go to <a href="/dashboard/businesses" className="text-blue-600 hover:underline">Business Management</a></li>
                                        <li>• Click <span className="font-mono bg-gray-100 px-1">+ Add New Business</span></li>
                                    </ul>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">2.2. Fill in Business Details</h3>
                                    <div className="ml-4 space-y-2">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <ul className="space-y-2 text-sm text-gray-700">
                                                <li><strong>Business Name:</strong> Your company name</li>
                                                <li><strong>Pixel ID:</strong> A unique identifier (e.g., "my-business-pixel")</li>
                                                <li><strong>Description:</strong> Optional description</li>
                                            </ul>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            💡 The Pixel ID will be used to track conversions on your website
                                        </p>
                                    </div>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">2.3. Save the Business</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Click <span className="font-mono bg-gray-100 px-1">Create Business</span></li>
                                        <li>• Note down your Pixel ID for the next step</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 3: Add Pixel to Website */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
                <button
                    onClick={() => toggleSection('add-pixel')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-blue-600">3</span>
                        </div>
                        <Code className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Add Tracking Pixel to Your Website</h2>
                    </div>
                    {expandedSections.includes('add-pixel') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {expandedSections.includes('add-pixel') && (
                    <div className="px-6 pb-6 border-t">
                        <div className="mt-4 space-y-4">
                            <div className="bg-gray-900 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400">Pixel Code</span>
                                    <button
                                        onClick={() => copyToClipboard(pixelCode)}
                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                                    >
                                        <Copy className="w-3 h-3" />
                                        {copiedCode ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <code className="text-sm text-green-400">
                                    {pixelCode}
                                </code>
                            </div>

                            <ol className="space-y-4">
                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">3.1. Replace YOUR_PIXEL_ID</h3>
                                    <p className="text-sm text-gray-700 ml-4">
                                        Replace <span className="font-mono bg-gray-100 px-1">YOUR_PIXEL_ID</span> with the Pixel ID
                                        you created in Step 2
                                    </p>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">3.2. Add to Your Website</h3>
                                    <div className="ml-4 space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Installation methods:</p>
                                        <ul className="space-y-2 text-sm text-gray-600">
                                            <li><strong>WordPress:</strong> Add to header.php or use a plugin like "Insert Headers and Footers"</li>
                                            <li><strong>Shopify:</strong> Go to Online Store → Themes → Edit code → theme.liquid</li>
                                            <li><strong>Wix:</strong> Use the Tracking Tools & Analytics feature</li>
                                            <li><strong>Custom HTML:</strong> Add before the closing <span className="font-mono">&lt;/body&gt;</span> tag</li>
                                        </ul>
                                    </div>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">3.3. Test the Pixel</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Visit your website with <span className="font-mono bg-gray-100 px-1">?gclid=TEST123</span> in the URL</li>
                                        <li>• Fill out a form with test email/phone</li>
                                        <li>• Check browser console for pixel activity</li>
                                    </ul>
                                </li>
                            </ol>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800">
                                    <strong>✓ The pixel will:</strong> Capture GCLID parameters, store them for 90 days,
                                    and collect form data (email/phone) for attribution matching.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 4: Connect Google Account */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
                <button
                    onClick={() => toggleSection('connect-google')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-blue-600">4</span>
                        </div>
                        <Link className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Connect Google Ads Account</h2>
                    </div>
                    {expandedSections.includes('connect-google') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {expandedSections.includes('connect-google') && (
                    <div className="px-6 pb-6 border-t">
                        <div className="mt-4 space-y-4">
                            <ol className="space-y-4">
                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">4.1. OAuth Connection</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Go to <a href="/dashboard/google/settings" className="text-blue-600 hover:underline">Google Ads Settings</a></li>
                                        <li>• Find your business</li>
                                        <li>• Click <span className="font-mono bg-gray-100 px-1">Connect OAuth</span></li>
                                        <li>• Authorize access to your Google Ads account</li>
                                    </ul>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">4.2. Sync Google Ads Accounts</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• After OAuth, click <span className="font-mono bg-gray-100 px-1">Sync All Accounts</span></li>
                                        <li>• This will fetch all your Google Ads accounts</li>
                                    </ul>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">4.3. Link Account to Business</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Click <span className="font-mono bg-gray-100 px-1">Link Existing Account</span></li>
                                        <li>• Select your business</li>
                                        <li>• Select the Google Ads account to link</li>
                                        <li>• Click <span className="font-mono bg-gray-100 px-1">Link Account</span></li>
                                    </ul>
                                </li>
                            </ol>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> You can link multiple Google Ads accounts to a single business if needed.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 5: Prepare Conversion Data */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
                <button
                    onClick={() => toggleSection('prepare-data')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-blue-600">5</span>
                        </div>
                        <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Prepare Your Conversion Data</h2>
                    </div>
                    {expandedSections.includes('prepare-data') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {expandedSections.includes('prepare-data') && (
                    <div className="px-6 pb-6 border-t">
                        <div className="mt-4 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-2">CSV Format Requirements</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 pr-4">Column Name</th>
                                                <th className="text-left py-2 pr-4">Required</th>
                                                <th className="text-left py-2">Example</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-700">
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">email</td>
                                                <td className="py-2 pr-4">Yes*</td>
                                                <td className="py-2">john@example.com</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">phone</td>
                                                <td className="py-2 pr-4">Yes*</td>
                                                <td className="py-2">555-0123</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">first_name</td>
                                                <td className="py-2 pr-4">Recommended</td>
                                                <td className="py-2">John</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">last_name</td>
                                                <td className="py-2 pr-4">Recommended</td>
                                                <td className="py-2">Doe</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">city</td>
                                                <td className="py-2 pr-4">Optional</td>
                                                <td className="py-2">New York</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">state</td>
                                                <td className="py-2 pr-4">Optional</td>
                                                <td className="py-2">NY</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">zip_code</td>
                                                <td className="py-2 pr-4">Optional</td>
                                                <td className="py-2">10001</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">purchase_amount</td>
                                                <td className="py-2 pr-4">Yes</td>
                                                <td className="py-2">150.00</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 pr-4 font-mono">purchase_date</td>
                                                <td className="py-2 pr-4">Yes</td>
                                                <td className="py-2">2025-01-28</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2 pr-4 font-mono">order_id</td>
                                                <td className="py-2 pr-4">Yes</td>
                                                <td className="py-2">ORDER-001</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    * At least one identifier (email or phone) is required
                                </p>
                            </div>

                            <ol className="space-y-4">
                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">5.1. Export Your Sales Data</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Export from your CRM, e-commerce platform, or POS system</li>
                                        <li>• Include all offline and phone sales</li>
                                        <li>• Date range should be within last 90 days</li>
                                    </ul>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">5.2. Fix CRM Column Names</h3>
                                    <div className="ml-4 space-y-3">
                                        <p className="text-sm text-gray-700">
                                            If your CRM exports have different column names, rename them to match our requirements:
                                        </p>

                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <p className="text-xs font-medium text-yellow-800 mb-2">Common CRM Field Mappings:</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-yellow-700">
                                                <div><strong>Email:</strong> "Email Address" → "email"</div>
                                                <div><strong>Phone:</strong> "Phone Number" → "phone"</div>
                                                <div><strong>Name:</strong> "First Name" → "first_name"</div>
                                                <div><strong>Name:</strong> "Last Name" → "last_name"</div>
                                                <div><strong>Location:</strong> "Zip Code" → "zip_code"</div>
                                                <div><strong>Amount:</strong> "Revenue" → "purchase_amount"</div>
                                                <div><strong>Date:</strong> "Sale Date" → "purchase_date"</div>
                                                <div><strong>ID:</strong> "Transaction ID" → "order_id"</div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-100 rounded-lg p-3">
                                            <p className="text-xs font-medium text-gray-700 mb-2">Examples of CRM exports to fix:</p>
                                            <div className="space-y-2 text-xs text-gray-600">
                                                <div>
                                                    <span className="text-red-600">❌ Wrong:</span> "Customer Email", "Phone #", "Total Revenue", "Date Purchased"
                                                </div>
                                                <div>
                                                    <span className="text-green-600">✅ Correct:</span> "email", "phone", "purchase_amount", "purchase_date"
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-xs font-medium text-blue-800 mb-1">Quick Fix Tips:</p>
                                            <ul className="text-xs text-blue-700 space-y-1">
                                                <li>• Open CSV in Excel or Google Sheets</li>
                                                <li>• Rename column headers to match our format exactly</li>
                                                <li>• Use lowercase and underscores (e.g., "first_name" not "First Name")</li>
                                                <li>• Save as CSV before uploading</li>
                                            </ul>
                                        </div>
                                    </div>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">5.3. Format Your CSV</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Use the column names exactly as shown in the table above</li>
                                        <li>• Save as UTF-8 encoded CSV</li>
                                        <li>• Remove any duplicate orders</li>
                                        <li>• Ensure dates are in YYYY-MM-DD format</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 6: Enhance Conversions */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
                <button
                    onClick={() => toggleSection('enhance-data')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-blue-600">6</span>
                        </div>
                        <Zap className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Enhance Your Conversion Data</h2>
                    </div>
                    {expandedSections.includes('enhance-data') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {expandedSections.includes('enhance-data') && (
                    <div className="px-6 pb-6 border-t">
                        <div className="mt-4 space-y-4">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h3 className="font-semibold text-purple-900 mb-2">What is Enhancement?</h3>
                                <p className="text-sm text-purple-800">
                                    Enhancement matches your offline conversions with Google Click IDs (GCLIDs) captured by your pixel,
                                    enabling accurate attribution back to specific ads and campaigns.
                                </p>
                            </div>

                            <ol className="space-y-4">
                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">6.1. Navigate to Enhance Page</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Go to <a href="/dashboard/google-ads/enhance-conversions" className="text-blue-600 hover:underline">Enhance Conversions</a></li>
                                        <li>• Select your business from the dropdown</li>
                                    </ul>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">6.2. Upload Your CSV</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• Click the upload area or drag your CSV file</li>
                                        <li>• Review the preview to ensure data looks correct</li>
                                        <li>• Click <span className="font-mono bg-gray-100 px-1">Enhance CSV</span></li>
                                    </ul>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">6.3. Review Enhancement Results</h3>
                                    <div className="ml-4 space-y-2">
                                        <p className="text-sm text-gray-700">You'll see statistics showing:</p>
                                        <ul className="space-y-1 text-sm text-gray-600">
                                            <li><strong>GCLID Matched:</strong> Conversions matched with click IDs (best attribution)</li>
                                            <li><strong>Enhanced Only:</strong> Matched via email/phone (good attribution)</li>
                                            <li><strong>No Match:</strong> Will rely on customer data only</li>
                                        </ul>
                                    </div>
                                </li>

                                <li>
                                    <h3 className="font-semibold text-gray-900 mb-2">6.4. Download Enhanced CSV</h3>
                                    <ul className="ml-4 space-y-2 text-sm text-gray-700">
                                        <li>• The enhanced CSV will auto-download</li>
                                        <li>• It includes GCLIDs, hashed data, and proper formatting</li>
                                        <li>• Save this file for the final upload step</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 7: Upload to Google Ads */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
                <button
                    onClick={() => toggleSection('upload-google')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-green-600">7</span>
                        </div>
                        <Upload className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Upload to Google Ads</h2>
                    </div>
                    {expandedSections.includes('upload-google') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {expandedSections.includes('upload-google') && (
                    <div className="px-6 pb-6 border-t">
                        <div className="mt-4 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Two Options:</strong> Upload via the app (automatic) or manually in Google Ads
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Option A: Upload via App (Recommended)</h3>
                                    <ol className="ml-4 space-y-3">
                                        <li className="text-sm text-gray-700">
                                            1. Go to <a href="/dashboard/google/upload" className="text-blue-600 hover:underline">Upload Conversions</a>
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            2. Select your business
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            3. Select the Google Ads account
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            4. Select the conversion action you created in Step 1
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            5. Upload the enhanced CSV
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            6. Enable "Auto-sync" for automatic upload
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            7. Click <span className="font-mono bg-gray-100 px-1">Upload & Process</span>
                                        </li>
                                    </ol>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Option B: Manual Upload in Google Ads</h3>
                                    <ol className="ml-4 space-y-3">
                                        <li className="text-sm text-gray-700">
                                            1. Go to Google Ads → Tools → Conversions → Uploads
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            2. Click <span className="font-mono bg-gray-100 px-1">+ Upload</span>
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            3. Select your conversion action
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            4. Upload the enhanced CSV
                                        </li>
                                        <li className="text-sm text-gray-700">
                                            5. Review and apply
                                        </li>
                                    </ol>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-semibold text-green-900 mb-2">✅ Success!</h3>
                                <p className="text-sm text-green-800">
                                    Your conversions will appear in Google Ads within 3 hours.
                                    Check the "All conversions" column in your campaigns to see the imported data.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Troubleshooting */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Common Issues & Solutions
                </h2>
                <div className="space-y-3">
                    <details className="bg-white rounded-lg p-4">
                        <summary className="font-medium text-gray-900 cursor-pointer">Pixel not tracking</summary>
                        <ul className="mt-2 ml-4 space-y-1 text-sm text-gray-700">
                            <li>• Check if pixel code is correctly installed</li>
                            <li>• Verify the Pixel ID matches your business</li>
                            <li>• Check browser console for errors</li>
                            <li>• Ensure JavaScript is enabled</li>
                        </ul>
                    </details>

                    <details className="bg-white rounded-lg p-4">
                        <summary className="font-medium text-gray-900 cursor-pointer">Low match rates</summary>
                        <ul className="mt-2 ml-4 space-y-1 text-sm text-gray-700">
                            <li>• Ensure pixel has been installed for at least a week</li>
                            <li>• Check that forms capture email/phone correctly</li>
                            <li>• Verify data formatting (especially phone numbers)</li>
                            <li>• Conversions must be within 90 days of click</li>
                        </ul>
                    </details>

                    <details className="bg-white rounded-lg p-4">
                        <summary className="font-medium text-gray-900 cursor-pointer">Upload errors</summary>
                        <ul className="mt-2 ml-4 space-y-1 text-sm text-gray-700">
                            <li>• Check CSV formatting matches requirements</li>
                            <li>• Remove duplicate order IDs</li>
                            <li>• Ensure dates are in correct format (YYYY-MM-DD)</li>
                            <li>• Verify conversion action is enabled in Google Ads</li>
                        </ul>
                    </details>
                </div>
            </div>

            {/* Next Steps */}
            <div className="mt-8 bg-blue-50 rounded-lg p-6">
                <h2 className="font-semibold text-blue-900 mb-3">Next Steps</h2>
                <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Set up automated daily uploads for continuous tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Monitor your Google Ads campaigns for improved ROAS</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Use Smart Bidding strategies with your enhanced conversion data</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Review attribution reports to optimize ad spend</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}