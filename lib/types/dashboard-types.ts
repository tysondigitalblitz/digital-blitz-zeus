export type DailyData = { date: string; clicks: number; conversions: number };
export type PlatformData = { name: string; value: number; color: string };
export type CampaignData = { campaign: string; clicks: number; conversions: number; ctr: number };
export type RecentEvent = { id: number; email: string | null; phone: string | null; campaign: string; time: string; platform: string };

export type DashboardData = {
    totalClicks: number;
    uniqueVisitors: number;
    conversions: number;
    conversionRate: number;
    dailyData: DailyData[];
    platformData: PlatformData[];
    campaignData: CampaignData[];
    recentEvents: RecentEvent[];
};

export type MetricCardProps = {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    change?: number;
    color: string;
};