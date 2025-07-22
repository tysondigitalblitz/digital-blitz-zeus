'use client'

import { useState } from 'react';
import { Upload, Plus, Calendar, BarChart3, TrendingUp, Check } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MetricCardProps } from '@/lib/types/dashboard-types';

const MetaConversionsDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedClient, setSelectedClient] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [clients, setClients] = useState([
        { id: '1', name: 'Acme Corp', company_name: 'Acme Corporation', meta_pixel_id: '123456789' },
        { id: '2', name: 'Tech Startup', company_name: 'Tech Startup Inc', meta_pixel_id: '987654321' }
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [analytics, setAnalytics] = useState({
        totalUploaded: 15847,
        totalProcessed: 14293,
        successRate: 90.2,
        totalValue: 458920,
        recentBatches: [
            { id: 'batch_001', client: 'Acme Corp', events: 1250, status: 'completed', date: '2024-01-15' },
            { id: 'batch_002', client: 'Tech Startup', events: 850, status: 'processing', date: '2024-01-16' },
            { id: 'batch_003', client: 'Acme Corp', events: 920, status: 'completed', date: '2024-01-17' }
        ],
        eventTypeData: [
            { name: 'Purchase', value: 45, color: '#0088FE' },
            { name: 'Lead', value: 30, color: '#00C49F' },
            { name: 'AddToCart', value: 15, color: '#FFBB28' },
            { name: 'ViewContent', value: 10, color: '#FF8042' }
        ],
        dailyData: [
            { date: 'Jan 12', uploaded: 2150, processed: 1935, value: 45200 },
            { date: 'Jan 13', uploaded: 2480, processed: 2232, value: 52100 },
            { date: 'Jan 14', uploaded: 2890, processed: 2601, value: 61500 },
            { date: 'Jan 15', uploaded: 3120, processed: 2808, value: 68900 },
            { date: 'Jan 16', uploaded: 2650, processed: 2385, value: 58400 },
            { date: 'Jan 17', uploaded: 2557, processed: 2301, value: 55820 }
        ]
    });

    const UploadModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4">Upload Conversions</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select Client</label>
                    <select className="w-full p-2 border rounded-lg">
                        <option value="">Choose a client...</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Upload Method</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-4 border-2 rounded-lg hover:border-blue-500 transition-colors">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p className="font-medium">CSV Upload</p>
                            <p className="text-sm text-gray-600">Upload a CSV file with conversion data</p>
                        </button>
                        <button className="p-4 border-2 rounded-lg hover:border-blue-500 transition-colors">
                            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                            <p className="font-medium">Manual Entry</p>
                            <p className="text-sm text-gray-600">Enter conversion data manually</p>
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">CSV File</label>
                    <input type="file" accept=".csv" className="w-full p-2 border rounded-lg" />
                    <p className="text-sm text-gray-600 mt-1">
                        CSV should include: event_name, event_time, email, phone, value, currency
                    </p>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setShowUploadModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        Upload Conversions
                    </button>
                </div>
            </div>
        </div>
    );

    const ClientModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Add New Client</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Client Name</label>
                    <input type="text" className="w-full p-2 border rounded-lg" placeholder="John Doe" />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Company Name</label>
                    <input type="text" className="w-full p-2 border rounded-lg" placeholder="Acme Corporation" />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Meta Pixel ID</label>
                    <input type="text" className="w-full p-2 border rounded-lg" placeholder="123456789" />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Meta Access Token</label>
                    <input type="password" className="w-full p-2 border rounded-lg" placeholder="Your access token" />
                    <p className="text-sm text-gray-600 mt-1">
                        Keep this secure. It will be encrypted before storage.
                    </p>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setShowClientModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        Add Client
                    </button>
                </div>
            </div>
        </div>
    );

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-2xl font-bold text-gray-900">Meta Conversions Dashboard</h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowClientModal(true)}
                                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Client
                            </button>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Conversions
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="px-4 py-2 border rounded-lg"
                        >
                            <option value="all">All Clients</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="px-3 py-2 border rounded-lg"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-8">
                        {['overview', 'uploads', 'results'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard
                                icon={Upload}
                                title="Total Uploaded"
                                value={analytics.totalUploaded.toLocaleString()}
                                change={12.5}
                                color="bg-blue-600"
                            />
                            <MetricCard
                                icon={Check}
                                title="Processed"
                                value={analytics.totalProcessed.toLocaleString()}
                                change={8.3}
                                color="bg-green-600"
                            />
                            <MetricCard
                                icon={TrendingUp}
                                title="Success Rate"
                                value={`${analytics.successRate}%`}
                                change={-2.1}
                                color="bg-purple-600"
                            />
                            <MetricCard
                                icon={BarChart3}
                                title="Total Value"
                                value={`$${(analytics.totalValue / 1000).toFixed(1)}K`}
                                change={15.7}
                                color="bg-orange-600"
                            />
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Daily Trends */}
                            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload & Processing Trends</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={analytics.dailyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="uploaded" stroke="#3B82F6" strokeWidth={2} />
                                        <Line type="monotone" dataKey="processed" stroke="#10B981" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Event Type Distribution */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Types</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={analytics.eventTypeData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {analytics.eventTypeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Batches */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Upload Batches</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4 font-medium text-gray-700">Batch ID</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-700">Client</th>
                                            <th className="text-right py-3 px-4 font-medium text-gray-700">Events</th>
                                            <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                                            <th className="text-right py-3 px-4 font-medium text-gray-700">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.recentBatches.map((batch) => (
                                            <tr key={batch.id} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4 font-mono text-sm">{batch.id}</td>
                                                <td className="py-3 px-4">{batch.client}</td>
                                                <td className="text-right py-3 px-4">{batch.events.toLocaleString()}</td>
                                                <td className="text-center py-3 px-4">
                                                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${batch.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {batch.status}
                                                    </span>
                                                </td>
                                                <td className="text-right py-3 px-4">{batch.date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'uploads' && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Uploads</h3>
                        <p className="text-gray-600">Upload history and details will be shown here.</p>
                    </div>
                )}

                {activeTab === 'results' && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Results</h3>
                        <p className="text-gray-600">Meta API responses and processing results will be shown here.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showUploadModal && <UploadModal />}
            {showClientModal && <ClientModal />}
        </div>
    );
};

export default MetaConversionsDashboard;