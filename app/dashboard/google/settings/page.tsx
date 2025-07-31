'use client';
import React, { useState, useEffect } from 'react';
import { Building2, Link, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';

// Define interfaces
interface ConversionAction {
    id: string;
    conversion_action_id: string;
    conversion_action_name: string;
    status: string;
}

interface GoogleAdsAccount {
    id: string;
    customer_id: string;
    account_name: string;
    is_active: boolean;
    conversion_actions?: ConversionAction[];
}

interface Business {
    id: string;
    name: string;
    description?: string;
    pixel_id?: string;
    is_active: boolean;
    google_ads_connected_at?: string;
    google_ads_refresh_token?: string;
    google_ads_accounts?: GoogleAdsAccount[];
}

interface NewBusinessData {
    name: string;
    description: string;
    pixelId: string;
}

const BusinessSettingsPage = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [syncing, setSyncing] = useState<Record<string, boolean>>({});
    const [showNewBusiness, setShowNewBusiness] = useState<boolean>(false);
    const [newBusiness, setNewBusiness] = useState<NewBusinessData>({
        name: '',
        description: '',
        pixelId: ''
    });

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

    const connectGoogleAds = (businessId: string) => {
        window.location.href = `/api/auth/google?businessId=${businessId}`;
    };

    const syncAccounts = async (businessId: string, refreshToken: string) => {
        setSyncing(prev => ({ ...prev, [businessId]: true }));
        try {
            const response = await fetch('/api/google/accounts/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, refreshToken }),
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Synced ${result.synced} Google Ads accounts`);
                fetchBusinesses(); // Refresh to show new accounts
            } else {
                alert('Failed to sync accounts');
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('Error syncing accounts');
        } finally {
            setSyncing(prev => ({ ...prev, [businessId]: false }));
        }
    };

    const createBusiness = async () => {
        try {
            const response = await fetch('/api/businesses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newBusiness.name,
                    description: newBusiness.description,
                    pixelId: newBusiness.pixelId
                }),
            });

            if (response.ok) {
                setShowNewBusiness(false);
                setNewBusiness({ name: '', description: '', pixelId: '' });
                fetchBusinesses();
            }
        } catch (error) {
            console.error('Error creating business:', error);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading businesses...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-black">Business & Google Ads Settings</h1>
                <p className="text-gray-600">Manage your businesses and Google Ads account connections</p>
            </div>

            {/* Add New Business Button */}
            <button
                onClick={() => setShowNewBusiness(true)}
                className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                Add New Business
            </button>

            {/* New Business Form */}
            {showNewBusiness && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 className="text-lg font-bold mb-4 text-black">Create New Business</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">Business Name</label>
                            <input
                                type="text"
                                value={newBusiness.name}
                                onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                                placeholder="My Business"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">Description</label>
                            <input
                                type="text"
                                value={newBusiness.description}
                                onChange={(e) => setNewBusiness({ ...newBusiness, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                                placeholder="Optional description"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">Pixel ID</label>
                            <input
                                type="text"
                                value={newBusiness.pixelId}
                                onChange={(e) => setNewBusiness({ ...newBusiness, pixelId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black"
                                placeholder="Your tracking pixel ID"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={createBusiness}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Create Business
                            </button>
                            <button
                                onClick={() => setShowNewBusiness(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Business List */}
            <div className="space-y-6">
                {businesses.map((business) => (
                    <div key={business.id} className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-6 h-6 text-blue-600" />
                                <div>
                                    <h2 className="text-xl font-bold text-black">{business.name}</h2>
                                    {business.description && (
                                        <p className="text-gray-600 text-sm">{business.description}</p>
                                    )}
                                    {business.pixel_id && (
                                        <p className="text-gray-500 text-xs">Pixel ID: {business.pixel_id}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {business.google_ads_connected_at ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm text-green-600">Connected</span>
                                        <button
                                            onClick={() => business.google_ads_refresh_token && syncAccounts(business.id, business.google_ads_refresh_token)}
                                            disabled={syncing[business.id]}
                                            className="ml-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-5 h-5 ${syncing[business.id] ? 'animate-spin' : ''}`} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => connectGoogleAds(business.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <Link className="w-4 h-4" />
                                        Connect Google Ads
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Google Ads Accounts */}
                        {business.google_ads_accounts && business.google_ads_accounts.length > 0 && (
                            <div className="mt-4 border-t pt-4">
                                <h3 className="font-semibold mb-2 text-black">Google Ads Accounts</h3>
                                <div className="space-y-2">
                                    {business.google_ads_accounts.map((account) => (
                                        <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-black">{account.account_name}</p>
                                                <p className="text-sm text-gray-600">ID: {account.customer_id}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {account.conversion_actions && account.conversion_actions.length > 0 && (
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                        {account.conversion_actions.length} conversion actions
                                                    </span>
                                                )}
                                                <a
                                                    href={`https://ads.google.com/aw/overview?__u=${account.customer_id.replace(/-/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-gray-500 hover:text-blue-600"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {businesses.length === 0 && (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No businesses configured yet.</p>
                    <p className="text-gray-600">Click Add New Business to get started.</p>
                </div>
            )}
        </div>
    );
};

export default BusinessSettingsPage;