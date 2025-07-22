'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, MousePointer, Mail, Phone, Globe } from 'lucide-react';
import type { DashboardData, MetricCardProps } from '../../../lib/types/dashboard-types';

const Dashboard = () => {
    const [data, setData] = useState<DashboardData>({
        totalClicks: 0,
        uniqueVisitors: 0,
        conversions: 0,
        conversionRate: 0,
        dailyData: [],
        platformData: [],
        campaignData: [],
        recentEvents: []
    });

    const [dateRange, setDateRange] = useState('7d');
    const [loading, setLoading] = useState(true);

    // Simulate fetching data - replace with actual API call
    useEffect(() => {
        fetchDashboardData();
    }, [dateRange]);

    const fetchDashboardData = async () => {
        setLoading(true);
        // Simulate API call - replace with actual fetch to your endpoint
        setTimeout(() => {
            setData({
                totalClicks: 1247,
                uniqueVisitors: 892,
                conversions: 67,
                conversionRate: 7.5,
                dailyData: [
                    { date: 'Mon', clicks: 145, conversions: 8 },
                    { date: 'Tue', clicks: 189, conversions: 12 },
                    { date: 'Wed', clicks: 201, conversions: 9 },
                    { date: 'Thu', clicks: 167, conversions: 11 },
                    { date: 'Fri', clicks: 234, conversions: 15 },
                    { date: 'Sat', clicks: 178, conversions: 7 },
                    { date: 'Sun', clicks: 133, conversions: 5 }
                ],
                platformData: [
                    { name: 'Wix', value: 45, color: '#0088FE' },
                    { name: 'WordPress', value: 30, color: '#00C49F' },
                    { name: 'Shopify', value: 15, color: '#FFBB28' },
                    { name: 'Unknown', value: 10, color: '#FF8042' }
                ],
                campaignData: [
                    { campaign: 'Summer Sale', clicks: 456, conversions: 34, ctr: 7.5 },
                    { campaign: 'Brand Awareness', clicks: 312, conversions: 18, ctr: 5.8 },
                    { campaign: 'Product Launch', clicks: 289, conversions: 12, ctr: 4.2 },
                    { campaign: 'Retargeting', clicks: 190, conversions: 3, ctr: 1.6 }
                ],
                recentEvents: [
                    { id: 1, email: 'john***@gmail.com', phone: '555-***-1234', campaign: 'Summer Sale', time: '2 min ago', platform: 'wix' },
                    { id: 2, email: 'sarah***@yahoo.com', phone: null, campaign: 'Brand Awareness', time: '5 min ago', platform: 'wordpress' },
                    { id: 3, email: 'mike***@hotmail.com', phone: '555-***-5678', campaign: 'Product Launch', time: '12 min ago', platform: 'shopify' },
                    { id: 4, email: null, phone: '555-***-9012', campaign: 'Summer Sale', time: '18 min ago', platform: 'wix' },
                    { id: 5, email: 'emma***@gmail.com', phone: '555-***-3456', campaign: 'Retargeting', time: '25 min ago', platform: 'unknown' }
                ]
            });
            setLoading(false);
        }, 1000);
    };

    const MetricCard = ({ icon: Icon, title, value, change, color }: MetricCardProps) => (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                {change !== undefined && (
                    <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change > 0 ? '+' : ''}{change}%
                    </span>
                )}
            </div>
            <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Pixel Analytics Dashboard</h1>
                    <p className="text-gray-600 mt-2">Track your Google Ads conversions and user interactions</p>
                </div>

                {/* Date Range Selector */}
                <div className="mb-6 flex gap-2">
                    {['24h', '7d', '30d', '90d'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dateRange === range
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {range === '24h' ? 'Last 24 Hours' : `Last ${range}`}
                        </button>
                    ))}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        icon={MousePointer}
                        title="Total Clicks"
                        value={data.totalClicks.toLocaleString()}
                        change={12.5}
                        color="bg-blue-600"
                    />
                    <MetricCard
                        icon={Users}
                        title="Unique Visitors"
                        value={data.uniqueVisitors.toLocaleString()}
                        change={8.3}
                        color="bg-green-600"
                    />
                    <MetricCard
                        icon={Mail}
                        title="Conversions"
                        value={data.conversions}
                        change={-2.1}
                        color="bg-purple-600"
                    />
                    <MetricCard
                        icon={Globe}
                        title="Conversion Rate"
                        value={`${data.conversionRate}%`}
                        change={5.7}
                        color="bg-orange-600"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Daily Trends */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trends</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data.dailyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} />
                                <Line type="monotone" dataKey="conversions" stroke="#10B981" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Platform Distribution */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.platformData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.value}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {data.platformData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Campaign Performance */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Campaign</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Clicks</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Conversions</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-700">CTR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.campaignData.map((campaign, index) => (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4">{campaign.campaign}</td>
                                        <td className="text-right py-3 px-4">{campaign.clicks}</td>
                                        <td className="text-right py-3 px-4">{campaign.conversions}</td>
                                        <td className="text-right py-3 px-4">
                                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${campaign.ctr > 5 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {campaign.ctr}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Events */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h3>
                    <div className="space-y-4">
                        {data.recentEvents.map((event) => (
                            <div key={event.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                <div className="flex items-center space-x-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center space-x-2">
                                            {event.email && (
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Mail className="w-4 h-4 mr-1" />
                                                    {event.email}
                                                </div>
                                            )}
                                            {event.phone && (
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Phone className="w-4 h-4 mr-1" />
                                                    {event.phone}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="text-xs text-gray-500">{event.campaign}</span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs text-gray-500">{event.platform}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-sm text-gray-500">{event.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;