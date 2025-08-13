'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
    totalConversions: number;
    googleConversions: number;
    metaConversions: number;
    totalRevenue: number;
    googleRevenue: number;
    metaRevenue: number;
    matchRate: number;
    lastUpload: string | null;
    activeBusinesses: number;
    syncedToGoogle?: number;
    syncedToMeta?: number;
}

interface RecentActivity {
    id: string;
    type: 'upload' | 'sync' | 'match';
    platform: 'google' | 'meta' | 'system';
    description: string;
    timestamp: string;
    status: 'success' | 'error' | 'pending';
}

export default function MainDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalConversions: 0,
        googleConversions: 0,
        metaConversions: 0,
        totalRevenue: 0,
        googleRevenue: 0,
        metaRevenue: 0,
        matchRate: 0,
        lastUpload: null,
        activeBusinesses: 0,
        syncedToGoogle: 0,
        syncedToMeta: 0
    });

    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');


    useEffect(() => {
        fetchDashboardData();
    }, [timeRange]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch dashboard statistics
            const statsResponse = await fetch(`/api/dashboard/stats?timeRange=${timeRange}`);
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData);
            }

            // Fetch recent activity
            const activityResponse = await fetch('/api/dashboard/activity');
            if (activityResponse.ok) {
                const activityData = await activityResponse.json();
                setRecentActivity(activityData);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getActivityIcon = (type: string, platform: string) => {
        if (type === 'upload') return '📄';
        if (type === 'sync' && platform === 'google') return '🔍';
        if (type === 'sync' && platform === 'meta') return '📘';
        if (type === 'match') return '🎯';
        return '⚡';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-500';
            case 'error': return 'text-red-500';
            case 'pending': return 'text-yellow-500';
            default: return 'text-gray-500';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                ⚡ Zeus Dashboard
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Offline Attribution & Conversion Tracking Overview
                            </p>
                        </div>

                        {/* Time Range Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Time Range:</span>
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="24h">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 90 Days</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Conversions */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Conversions</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.totalConversions.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-indigo-100 rounded-full">
                                <span className="text-2xl">🎯</span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-green-600">Google: {stats.googleConversions}</span>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="text-blue-600">Meta: {stats.metaConversions}</span>
                        </div>
                    </div>

                    {/* Total Revenue */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <span className="text-2xl">💰</span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-green-600">Google: {formatCurrency(stats.googleRevenue)}</span>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="text-blue-600">Meta: {formatCurrency(stats.metaRevenue)}</span>
                        </div>
                    </div>

                    {/* Match Rate */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Match Rate</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.matchRate.toFixed(1)}%</p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-full">
                                <span className="text-2xl">📊</span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${stats.matchRate}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Active Businesses */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Businesses</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.activeBusinesses}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <span className="text-2xl">🏢</span>
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-gray-600">
                            {stats.lastUpload ? `Last upload: ${formatDate(stats.lastUpload)}` : 'No recent uploads'}
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link
                                href="/dashboard/upload"
                                className="flex items-center gap-3 p-3 text-left w-full bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200"
                            >
                                <span className="text-2xl">📄</span>
                                <div>
                                    <div className="font-medium text-gray-900">Upload Conversions</div>
                                    <div className="text-sm text-gray-600">Upload CSV files for processing</div>
                                </div>
                            </Link>

                            <Link
                                href="/dashboard/google/settings"
                                className="flex items-center gap-3 p-3 text-left w-full bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
                            >
                                <span className="text-2xl">🔍</span>
                                <div>
                                    <div className="font-medium text-gray-900">Google Ads Settings</div>
                                    <div className="text-sm text-gray-600">Manage Google Ads integration</div>
                                </div>
                            </Link>

                            <Link
                                href="/dashboard/meta/settings"
                                className="flex items-center gap-3 p-3 text-left w-full bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                            >
                                <span className="text-2xl">📘</span>
                                <div>
                                    <div className="font-medium text-gray-900">Meta Settings</div>
                                    <div className="text-sm text-gray-600">Configure Meta Conversions API</div>
                                </div>
                            </Link>

                            <Link
                                href="/dashboard/reports"
                                className="flex items-center gap-3 p-3 text-left w-full bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200"
                            >
                                <span className="text-2xl">📊</span>
                                <div>
                                    <div className="font-medium text-gray-900">View Reports</div>
                                    <div className="text-sm text-gray-600">Attribution & performance reports</div>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                            <button
                                onClick={fetchDashboardData}
                                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <span>🔄</span> Refresh
                            </button>
                        </div>

                        <div className="space-y-3">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xl">{getActivityIcon(activity.type, activity.platform)}</span>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{activity.description}</div>
                                            <div className="text-sm text-gray-600">{formatDate(activity.timestamp)}</div>
                                        </div>
                                        <div className={`text-sm font-medium ${getStatusColor(activity.status)}`}>
                                            {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <span className="text-4xl mb-2 block">📭</span>
                                    No recent activity found
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Platform Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {/* Google Ads Status */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                🔍 Google Ads Integration
                            </h3>
                            <Link
                                href="/dashboard/google"
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                View Details →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Connection Status</span>
                                <span className="text-green-600 font-medium">✅ Connected</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Conversions ({timeRange})</span>
                                <span className="text-gray-900 font-medium">{stats.googleConversions.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Synced to Google</span>
                                <span className="text-green-600 font-medium">{stats.syncedToGoogle || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Revenue</span>
                                <span className="text-gray-900 font-medium">{formatCurrency(stats.googleRevenue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Upload Status */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                📄 Upload Status
                            </h3>
                            <Link
                                href="/upload"
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Upload Now →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Last Upload</span>
                                <span className="text-gray-900">
                                    {stats.lastUpload ? formatDate(stats.lastUpload) : 'No uploads yet'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Match Rate</span>
                                <span className="text-gray-900 font-medium">{stats.matchRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Active Businesses</span>
                                <span className="text-gray-900 font-medium">{stats.activeBusinesses}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Revenue</span>
                                <span className="text-gray-900 font-medium">{formatCurrency(stats.totalRevenue)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}