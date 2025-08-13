'use client';
import React, { useState, useEffect } from 'react';
import { Building2, Link, ExternalLink, Settings, Trash2, CheckCircle, AlertCircle, RotateCcw, Unlink } from 'lucide-react';

interface GoogleAdsAccount {
    id: string;
    customer_id: string;
    account_name: string;
    account_type: string;
    is_active: boolean;
    business_name?: string;
    conversion_actions_count: number;
    has_enhanced_conversions: boolean;
}

interface Business {
    id: string;
    name: string;
    description?: string;
    google_ads_accounts?: GoogleAdsAccount[];
    hasGoogleOAuth: boolean;
    hasGoogleAds: boolean;
    google_ads_refresh_token?: string;
    hasEnhancedConversions?: boolean;
    hasConversionActions?: boolean;
    hasConversionTracking?: boolean;
}

const ImprovedGoogleAdsSetup = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [availableAccounts, setAvailableAccounts] = useState<GoogleAdsAccount[]>([]);
    const [showLinkAccount, setShowLinkAccount] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [linking, setLinking] = useState(false);
    const [unlinkingAll, setUnlinkingAll] = useState(false);

    useEffect(() => {
        fetchBusinesses();
        fetchAvailableAccounts();
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

    const fetchAvailableAccounts = async () => {
        try {
            const response = await fetch('/api/google/accounts/link');
            const data = await response.json();
            setAvailableAccounts(data.accounts || []);
        } catch (error) {
            console.error('Error fetching available accounts:', error);
        }
    };

    const linkExistingAccount = async () => {
        if (!selectedBusiness || !selectedAccount) return;

        setLinking(true);
        try {
            const response = await fetch('/api/google/accounts/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: selectedBusiness,
                    googleAdsAccountId: selectedAccount
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('✅ Account linked successfully!');
                setShowLinkAccount(false);
                setSelectedBusiness('');
                setSelectedAccount('');
                fetchBusinesses();
                fetchAvailableAccounts();
            } else {
                alert(`❌ Failed to link account: ${result.error}`);
            }
        } catch (error) {
            console.error('Error linking account:', error);
            alert('❌ Failed to link account');
        } finally {
            setLinking(false);
        }
    };

    const syncGoogleAdsAccounts = async (businessId: string, refreshToken?: string) => {
        setSyncing(true);
        try {
            // Use the business's refresh token if available
            const business = businesses.find(b => b.id === businessId);
            const token = refreshToken || business?.google_ads_refresh_token;

            if (!token) {
                alert('❌ No refresh token available. Connect OAuth first.');
                return;
            }

            const response = await fetch('/api/google/accounts/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refreshToken: token,
                    businessId: businessId
                })
            });

            const result = await response.json();
            if (result.success) {
                alert(`✅ Synced ${result.synced} accounts successfully! Now use "Link Existing Account" to connect them to businesses.`);
                fetchBusinesses();
                fetchAvailableAccounts();
            } else {
                alert(`❌ Sync failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Error syncing accounts:', error);
            alert('❌ Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const unlinkAccount = async (accountId: string) => {
        if (!confirm('Are you sure you want to unlink this account?')) return;

        try {
            const response = await fetch('/api/google/accounts/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: null, // Unlink by setting to null
                    googleAdsAccountId: accountId
                })
            });

            if (response.ok) {
                fetchBusinesses();
                fetchAvailableAccounts();
                alert('Account unlinked successfully');
            }
        } catch (error) {
            alert('Failed to unlink account');
            console.error('Error unlinking account:', error);
        }
    };

    const unlinkAllAccounts = async () => {
        if (!confirm('Are you sure you want to unlink ALL Google Ads accounts? This will remove all business connections.')) return;

        setUnlinkingAll(true);
        try {
            const response = await fetch('/api/google/accounts/unlink-all', {
                method: 'POST'
            });

            const result = await response.json();
            if (result.success) {
                alert(`✅ Successfully unlinked ${result.unlinkedAccounts?.length || 0} accounts!`);
                fetchBusinesses();
                fetchAvailableAccounts();
            } else {
                alert(`❌ Failed to unlink accounts: ${result.error}`);
            }
        } catch (error) {
            console.error('Error unlinking all accounts:', error);
            alert('❌ Failed to unlink accounts');
        } finally {
            setUnlinkingAll(false);
        }
    };

    const connectOAuth = (businessId: string) => {
        window.location.href = `/api/auth/google?businessId=${businessId}`;
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-black">Google Ads Account Management</h1>
                <p className="text-gray-600">Link your businesses to existing Google Ads accounts for enhanced conversion tracking</p>
            </div>

            {/* Sync & Link Controls */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setShowLinkAccount(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Link className="w-4 h-4" />
                    Link Existing Account
                </button>

                {businesses.some(b => b.hasGoogleOAuth) && (
                    <button
                        onClick={() => {
                            const businessWithOAuth = businesses.find(b => b.hasGoogleOAuth);
                            if (businessWithOAuth) {
                                syncGoogleAdsAccounts(businessWithOAuth.id);
                            }
                        }}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <RotateCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync All Accounts'}
                    </button>
                )}

                {availableAccounts.filter(acc => acc.business_name).length > 0 && (
                    <button
                        onClick={unlinkAllAccounts}
                        disabled={unlinkingAll}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        <Unlink className="w-4 h-4" />
                        {unlinkingAll ? 'Unlinking...' : 'Unlink All'}
                    </button>
                )}
            </div>

            {/* Link Account Modal */}
            {showLinkAccount && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border">
                    <h3 className="text-lg font-bold mb-4 text-black">Link Existing Google Ads Account</h3>

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
                            <label className="block text-sm font-medium mb-1 text-black">Google Ads Account</label>
                            <select
                                value={selectedAccount}
                                onChange={(e) => setSelectedAccount(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                            >
                                <option value="">Select an account from your synced accounts...</option>

                                {/* Show unlinked accounts first */}
                                {availableAccounts
                                    .filter(account => !account.business_name)
                                    .map(account => (
                                        <option key={account.id} value={account.id}>
                                            ✅ {account.account_name} ({account.customer_id}) - Available
                                            {account.has_enhanced_conversions && ' ✨'}
                                            {account.conversion_actions_count > 0 && ` - ${account.conversion_actions_count} conversions`}
                                        </option>
                                    ))
                                }

                                {/* Show a separator if we have both unlinked and linked accounts */}
                                {availableAccounts.filter(acc => !acc.business_name).length > 0 &&
                                    availableAccounts.filter(acc => acc.business_name).length > 0 && (
                                        <option disabled>───── Already Linked Accounts ─────</option>
                                    )}

                                {/* Show already linked accounts */}
                                {availableAccounts
                                    .filter(account => account.business_name)
                                    .sort((a, b) => a.account_name.localeCompare(b.account_name))
                                    .map(account => (
                                        <option key={account.id} value={account.id}>
                                            🔗 {account.account_name} ({account.customer_id}) - Linked to {account.business_name}
                                            {account.has_enhanced_conversions && ' ✨'}
                                            {account.conversion_actions_count > 0 && ` - ${account.conversion_actions_count} conversions`}
                                        </option>
                                    ))
                                }
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                ✅ = Available to link | 🔗 = Already linked | ✨ = Has Enhanced Conversions |
                                You can re-link accounts to different businesses
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>Available Accounts:</strong> {availableAccounts.length} total synced accounts.
                                <br />
                                <strong>Unlinked:</strong> {availableAccounts.filter(acc => !acc.business_name).length} accounts available to link.
                                <br />
                                <strong>Already Linked:</strong> {availableAccounts.filter(acc => acc.business_name).length} accounts currently linked.
                                <br />
                                {availableAccounts.filter(acc => acc.has_enhanced_conversions).length > 0 && (
                                    <><strong>Enhanced Ready:</strong> {availableAccounts.filter(acc => acc.has_enhanced_conversions).length} accounts support Enhanced Conversions.</>
                                )}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={linkExistingAccount}
                                disabled={!selectedBusiness || !selectedAccount || linking}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {linking ? 'Linking...' : 'Link Account'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowLinkAccount(false);
                                    setSelectedBusiness('');
                                    setSelectedAccount('');
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Status Overview */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3">Account Status Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <div className="font-medium text-blue-800">Total Accounts</div>
                        <div className="text-2xl font-bold text-blue-900">{availableAccounts.length}</div>
                    </div>
                    <div>
                        <div className="font-medium text-green-800">With Conversions</div>
                        <div className="text-2xl font-bold text-green-900">
                            {availableAccounts.filter(acc => acc.conversion_actions_count > 0).length}
                        </div>
                    </div>
                    <div>
                        <div className="font-medium text-purple-800">Enhanced Ready</div>
                        <div className="text-2xl font-bold text-purple-900">
                            {availableAccounts.filter(acc => acc.has_enhanced_conversions).length}
                        </div>
                    </div>
                    <div>
                        <div className="font-medium text-orange-800">Unlinked</div>
                        <div className="text-2xl font-bold text-orange-900">
                            {availableAccounts.filter(acc => !acc.business_name).length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Existing Accounts */}
            <div className="space-y-6">
                {businesses.map((business) => (
                    <div key={business.id} className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-6 h-6 text-blue-600" />
                                <h2 className="text-xl font-bold text-black">{business.name}</h2>
                                {business.hasGoogleOAuth && (
                                    <CheckCircle className="w-5 h-5 text-green-600" aria-label="OAuth Connected" />
                                )}
                            </div>

                            <div className="flex gap-2">
                                {!business.hasGoogleOAuth && (
                                    <button
                                        onClick={() => connectOAuth(business.id)}
                                        className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                    >
                                        Connect OAuth
                                    </button>
                                )}
                                {business.hasGoogleOAuth && (
                                    <button
                                        onClick={() => syncGoogleAdsAccounts(business.id)}
                                        disabled={syncing}
                                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {syncing ? 'Syncing...' : 'Sync'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {business.google_ads_accounts && business.google_ads_accounts.length > 0 ? (
                            <div className="space-y-3">
                                {business.google_ads_accounts.map((account) => (
                                    <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-black">{account.account_name}</p>
                                                {account.has_enhanced_conversions && (
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                        Enhanced Ready
                                                    </span>
                                                )}
                                                {!account.is_active && (
                                                    <AlertCircle className="w-4 h-4 text-yellow-600" aria-label="Account Inactive" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">Customer ID: {account.customer_id}</p>
                                            <p className="text-sm text-gray-600">
                                                {account.conversion_actions_count} conversion actions
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
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
                                                onClick={() => unlinkAccount(account.id)}
                                                className="p-1 text-gray-500 hover:text-red-600"
                                                title="Unlink Account"
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
                                <p>No Google Ads accounts linked</p>
                                <p className="text-sm">Click Link Existing Account to connect synced accounts</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {businesses.length === 0 && (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No businesses found.</p>
                    <p className="text-gray-600">Create a business first, then link Google Ads accounts.</p>
                </div>
            )}
        </div>
    );
};

export default ImprovedGoogleAdsSetup;