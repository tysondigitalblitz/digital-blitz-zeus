'use client';
// app/dashboard/google/settings/page.tsx
import React, { useState, useEffect } from 'react';
import { Building2, Plus, ExternalLink, Settings, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface GoogleAdsAccount {
    id: string;
    business_id: string;
    customer_id: string;
    account_name: string;
    conversion_action_id: string;
    conversion_action_name: string;
    is_active: boolean;
    refresh_token?: string;
    created_at: string;
}

interface Business {
    id: string;
    name: string;
    description?: string;
    google_ads_accounts?: GoogleAdsAccount[];
}

const SimplifiedGoogleAdsSetup = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [newAccount, setNewAccount] = useState({
        customer_id: '',
        account_name: '',
        conversion_action_id: '',
        conversion_action_name: ''
    });
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const response = await fetch('/api/businesses');
            const data = await response.json();
            setBusinesses(data.businesses || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
        } finally {
            setLoading(false);
        }
    };

    const addGoogleAdsAccount = async () => {
        try {
            const response = await fetch('/api/google/accounts/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_id: selectedBusiness,
                    customer_id: newAccount.customer_id.replace(/\s+/g, ''), // Remove spaces
                    account_name: newAccount.account_name,
                    conversion_action_id: newAccount.conversion_action_id,
                    conversion_action_name: newAccount.conversion_action_name
                })
            });

            if (response.ok) {
                setShowAddAccount(false);
                setNewAccount({ customer_id: '', account_name: '', conversion_action_id: '', conversion_action_name: '' });
                setSelectedBusiness('');
                fetchBusinesses();
                alert('Google Ads account added successfully!');
            } else {
                const error = await response.json();
                alert(`Error: ${error.message}`);
            }
        } catch (error) {
            console.error('Error adding account:', error);
            alert('Failed to add Google Ads account');
        }
    };

    const testAccount = async (accountId: string) => {
        setTesting(prev => ({ ...prev, [accountId]: true }));
        try {
            const response = await fetch(`/api/google/accounts/${accountId}/test`, {
                method: 'POST'
            });

            const result = await response.json();
            if (result.success) {
                alert('✅ Account connection test successful!');
            } else {
                alert(`❌ Test failed: ${result.error}`);
            }
        } catch (error) {
            alert('❌ Test failed: Network error');
            console.error('Error testing account:', error);
        } finally {
            setTesting(prev => ({ ...prev, [accountId]: false }));
        }
    };

    const deleteAccount = async (accountId: string) => {
        if (!confirm('Are you sure you want to delete this Google Ads account?')) return;

        try {
            const response = await fetch(`/api/google/accounts/${accountId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchBusinesses();
                alert('Account deleted successfully');
            }
        } catch (error) {
            alert('Failed to delete account');
            console.error('Error deleting account:', error);
        }
    };

    const connectOAuth = (businessId: string) => {
        // Redirect to OAuth flow to get refresh token
        window.location.href = `/api/auth/google?businessId=${businessId}`;
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-black">Google Ads Account Setup</h1>
                <p className="text-gray-600">Add your Google Ads accounts for enhanced conversion tracking</p>
            </div>

            {/* Add Account Button */}
            <button
                onClick={() => setShowAddAccount(true)}
                className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                <Plus className="w-4 h-4" />
                Add Google Ads Account
            </button>

            {/* Add Account Form */}
            {showAddAccount && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border">
                    <h3 className="text-lg font-bold mb-4 text-black">Add Google Ads Account</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">Business</label>
                            <select
                                value={selectedBusiness}
                                onChange={(e) => setSelectedBusiness(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-black"
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
                            <label className="block text-sm font-medium mb-1 text-black">
                                Customer ID
                                <span className="text-xs text-gray-500 ml-1">(Format: 123-456-7890)</span>
                            </label>
                            <input
                                type="text"
                                value={newAccount.customer_id}
                                onChange={(e) => setNewAccount({ ...newAccount, customer_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                                placeholder="123-456-7890"
                                pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Find this in Google Ads (top right corner) or in your Google Ads URL
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">Account Name</label>
                            <input
                                type="text"
                                value={newAccount.account_name}
                                onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                                placeholder="My Google Ads Account"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">
                                Conversion Action ID
                                <span className="text-xs text-gray-500 ml-1">(Numbers only)</span>
                            </label>
                            <input
                                type="text"
                                value={newAccount.conversion_action_id}
                                onChange={(e) => setNewAccount({ ...newAccount, conversion_action_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                                placeholder="123456789"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Go to Tools & Settings → Conversions → Click your conversion → Copy the ID from the URL
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">Conversion Action Name</label>
                            <input
                                type="text"
                                value={newAccount.conversion_action_name}
                                onChange={(e) => setNewAccount({ ...newAccount, conversion_action_name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                                placeholder="Purchase"
                            />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Need to connect OAuth?</strong> After adding the account, you will need to authorize
                                Zeus to access your Google Ads account for API calls.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={addGoogleAdsAccount}
                                disabled={!selectedBusiness || !newAccount.customer_id || !newAccount.conversion_action_id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                Add Account
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddAccount(false);
                                    setNewAccount({ customer_id: '', account_name: '', conversion_action_id: '', conversion_action_name: '' });
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3">How to find your Google Ads information:</h3>
                <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex items-start gap-2">
                        <span className="font-medium">1. Customer ID:</span>
                        <span>Look in the top right corner of Google Ads (format: 123-456-7890)</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-medium">2. Conversion Action ID:</span>
                        <span>Tools & Settings → Conversions → Click your conversion → Copy ID from URL (after ocid=)</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-medium">3. OAuth Connection:</span>
                        <span>You will connect this after adding the account to authorize API access</span>
                    </div>
                </div>
            </div>

            {/* Existing Accounts */}
            <div className="space-y-6">
                {businesses.map((business) => (
                    <div key={business.id} className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Building2 className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-bold text-black">{business.name}</h2>
                        </div>

                        {business.google_ads_accounts && business.google_ads_accounts.length > 0 ? (
                            <div className="space-y-3">
                                {business.google_ads_accounts.map((account) => (
                                    <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-black">{account.account_name}</p>
                                                {account.refresh_token ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600" aria-label="OAuth Connected" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-yellow-600" aria-label="OAuth Not Connected" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">Customer ID: {account.customer_id}</p>
                                            <p className="text-sm text-gray-600">Conversion: {account.conversion_action_name}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!account.refresh_token && (
                                                <button
                                                    onClick={() => connectOAuth(business.id)}
                                                    className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                                >
                                                    Connect OAuth
                                                </button>
                                            )}

                                            <button
                                                onClick={() => testAccount(account.id)}
                                                disabled={testing[account.id]}
                                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {testing[account.id] ? 'Testing...' : 'Test'}
                                            </button>

                                            <a
                                                href={`https://ads.google.com/aw/overview?__u=${account.customer_id.replace(/-/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 text-gray-500 hover:text-blue-600"
                                                title="Open in Google Ads"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>

                                            <button
                                                onClick={() => deleteAccount(account.id)}
                                                className="p-1 text-gray-500 hover:text-red-600"
                                                title="Delete Account"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No Google Ads accounts configured</p>
                                <p className="text-sm">Click Add Google Ads Account to get started</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {businesses.length === 0 && (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No businesses found.</p>
                    <p className="text-gray-600">Create a business first, then add Google Ads accounts.</p>
                </div>
            )}
        </div>
    );
};

export default SimplifiedGoogleAdsSetup;