'use client';
import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Settings, ExternalLink, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface Business {
    id: string;
    name: string;
    description?: string;
    pixel_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    google_ads_refresh_token?: string;
    google_ads_connected_at?: string;
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
    conversion_action_name: string;
    status: string;
}

interface NewBusinessForm {
    name: string;
    description: string;
    pixelId: string;
}

const BusinessManagementPage = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [newBusiness, setNewBusiness] = useState<NewBusinessForm>({
        name: '',
        description: '',
        pixelId: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/businesses');
            const data = await response.json();
            setBusinesses(data.businesses || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
            alert('Failed to fetch businesses');
        } finally {
            setLoading(false);
        }
    };

    const createBusiness = async () => {
        if (!newBusiness.name.trim()) {
            alert('Business name is required');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/businesses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newBusiness.name,
                    description: newBusiness.description,
                    pixelId: newBusiness.pixelId
                })
            });

            const result = await response.json();

            if (response.ok) {
                setShowAddForm(false);
                setNewBusiness({ name: '', description: '', pixelId: '' });
                fetchBusinesses();
                alert('Business created successfully!');
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error creating business:', error);
            alert('Failed to create business');
        } finally {
            setSaving(false);
        }
    };

    const updateBusiness = async () => {
        if (!editingBusiness) return;

        setSaving(true);
        try {
            const response = await fetch(`/api/businesses/${editingBusiness.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingBusiness.name,
                    description: editingBusiness.description,
                    pixel_id: editingBusiness.pixel_id
                })
            });

            if (response.ok) {
                setEditingBusiness(null);
                fetchBusinesses();
                alert('Business updated successfully!');
            } else {
                const result = await response.json();
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error updating business:', error);
            alert('Failed to update business');
        } finally {
            setSaving(false);
        }
    };

    const deleteBusiness = async (businessId: string, businessName: string) => {
        if (!confirm(`Are you sure you want to delete "${businessName}"? This will also delete all associated Google Ads accounts and conversion data.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/businesses/${businessId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchBusinesses();
                alert('Business deleted successfully');
            } else {
                const result = await response.json();
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting business:', error);
            alert('Failed to delete business');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading businesses...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-black">Business Management</h1>
                <p className="text-gray-600">Create and manage your businesses for conversion tracking</p>
            </div>

            {/* Add Business Button */}
            <div className="mb-6 flex justify-between items-center">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add New Business
                </button>

                <div className="text-sm text-gray-600">
                    {businesses.length} business{businesses.length !== 1 ? 'es' : ''} total
                </div>
            </div>

            {/* Add Business Form */}
            {showAddForm && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-black">Create New Business</h3>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">
                                Business Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={newBusiness.name}
                                onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="My Business Inc."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">
                                Pixel ID
                            </label>
                            <input
                                type="text"
                                value={newBusiness.pixelId}
                                onChange={(e) => setNewBusiness({ ...newBusiness, pixelId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="my-business-pixel"
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional: Unique identifier for tracking</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 text-black">
                            Description
                        </label>
                        <textarea
                            value={newBusiness.description}
                            onChange={(e) => setNewBusiness({ ...newBusiness, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Brief description of the business..."
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={createBusiness}
                            disabled={saving || !newBusiness.name.trim()}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Creating...' : 'Create Business'}
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Business Form */}
            {editingBusiness && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-black">Edit Business</h3>
                        <button
                            onClick={() => setEditingBusiness(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">
                                Business Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editingBusiness.name}
                                onChange={(e) => setEditingBusiness({ ...editingBusiness, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-black">
                                Pixel ID
                            </label>
                            <input
                                type="text"
                                value={editingBusiness.pixel_id || ''}
                                onChange={(e) => setEditingBusiness({ ...editingBusiness, pixel_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 text-black">
                            Description
                        </label>
                        <textarea
                            value={editingBusiness.description || ''}
                            onChange={(e) => setEditingBusiness({ ...editingBusiness, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={updateBusiness}
                            disabled={saving || !editingBusiness.name.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Updating...' : 'Update Business'}
                        </button>
                        <button
                            onClick={() => setEditingBusiness(null)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Business List */}
            <div className="space-y-4">
                {businesses.map((business) => (
                    <div key={business.id} className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-3">
                                <Building2 className="w-6 h-6 text-blue-600 mt-1" />
                                <div>
                                    <h3 className="text-xl font-semibold text-black">{business.name}</h3>
                                    {business.description && (
                                        <p className="text-gray-600 mt-1">{business.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            Created {formatDate(business.created_at)}
                                        </div>
                                        {business.pixel_id && (
                                            <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                Pixel: {business.pixel_id}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditingBusiness(business)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Business"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteBusiness(business.id, business.name)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Business"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Integration Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Google Ads Status */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Google Ads</span>
                                    {business.google_ads_refresh_token ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-600">
                                        {business.google_ads_accounts?.length || 0} account{(business.google_ads_accounts?.length || 0) !== 1 ? 's' : ''}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {business.google_ads_refresh_token
                                            ? `OAuth: ${business.google_ads_connected_at ? formatDate(business.google_ads_connected_at) : 'Connected'}`
                                            : 'Not connected'
                                        }
                                    </div>
                                </div>
                            </div>

                            {/* Meta Status (placeholder for future) */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Meta Ads</span>
                                    <AlertCircle className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-600">0 accounts</div>
                                    <div className="text-xs text-gray-500">Not configured</div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t">
                            <a
                                href={`/dashboard/google/settings`}
                                className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Google Ads Setup
                            </a>
                            <a
                                href={`/upload?businessId=${business.id}`}
                                className="flex items-center gap-1 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Upload Conversions
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {businesses.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No businesses yet</h3>
                    <p className="text-gray-600 mb-6">
                        Create your first business to start tracking offline conversions
                    </p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Your First Business
                    </button>
                </div>
            )}
        </div>
    );
};

export default BusinessManagementPage;