"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Activity, FileText, Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';

// --- Types ---
interface Prediction {
    id: string;
    created_at: string;
    disease: string;
    confidence: number;
    user_id: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    verified: boolean;
    subscription_tier: string;
    created_at: string;
}

// --- Colors ---
const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

export default function AdminPage() {
    const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
    const router = useRouter();

    // State
    const [loadingData, setLoadingData] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [recentPredictions, setRecentPredictions] = useState<Prediction[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Chart Data State
    const [activityData, setActivityData] = useState<any[]>([]);
    const [diseaseData, setDiseaseData] = useState<any[]>([]);
    const [subData, setSubData] = useState<any[]>([]);

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/signin');
            } else if (!isAdmin) {
                router.push('/dashboard');
            }
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    useEffect(() => {
        if (isAuthenticated && isAdmin) {
            fetchData();
        }
    }, [isAuthenticated, isAdmin]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const headers = { Authorization: `Bearer ${token}` };
            const apiUrl = 'http://127.0.0.1:5000'; // Hardcoded for stability

            // 1. Fetch Basic Stats
            const statsRes = await fetch(`${apiUrl}/api/admin/stats`, { headers });
            if (statsRes.ok) setStats(await statsRes.json());

            // 2. Fetch Users
            const usersRes = await fetch(`${apiUrl}/api/admin/users?limit=100`, { headers });
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users || []);
                processUserStats(data.users || []);
            }

            // 3. Fetch Predictions for Charts (Limit 1000 for client-side agg)
            const predsRes = await fetch(`${apiUrl}/api/admin/predictions?limit=1000`, { headers });
            if (predsRes.ok) {
                const data = await predsRes.json();
                const preds = data.predictions || [];
                setRecentPredictions(preds.slice(0, 10)); // Keep top 10 for table
                processChartData(preds);
            }

        } catch (error) {
            console.error("Error fetching admin data", error);
        } finally {
            setLoadingData(false);
        }
    };

    // --- Data Processing Helpers ---

    const processChartData = (preds: Prediction[]) => {
        // 1. Activity Over Time (Group by Date)
        const activityMap = new Map<string, number>();
        preds.forEach(p => {
            const date = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });
        // Convert to array and sort by date (simple sort for now)
        const activity = Array.from(activityMap.entries())
            .map(([date, count]) => ({ date, count }))
            .reverse(); // Assuming API returns newest first
        setActivityData(activity);

        // 2. Disease Distribution
        const diseaseMap = new Map<string, number>();
        preds.forEach(p => {
            const label = p.disease || 'Unknown';
            diseaseMap.set(label, (diseaseMap.get(label) || 0) + 1);
        });
        const diseases = Array.from(diseaseMap.entries())
            .map(([name, value]) => ({ name, value }));
        setDiseaseData(diseases);
    };

    const processUserStats = (usersList: User[]) => {
        // Subscription Tiers
        const subMap = new Map<string, number>();
        usersList.forEach(u => {
            const tier = u.subscription_tier || 'Free';
            subMap.set(tier, (subMap.get(tier) || 0) + 1);
        });
        const subs = Array.from(subMap.entries()).map(([name, value]) => ({ name, value }));
        setSubData(subs);
    };

    if (isLoading || !isAuthenticated || !isAdmin) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Overview of system performance and user activity.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        title="Total Users"
                        value={stats?.total_users || 0}
                        icon={Users}
                        trend="+12% from last month"
                        trendUp={true}
                    />
                    <KpiCard
                        title="Total Predictions"
                        value={stats?.total_predictions || 0}
                        icon={Activity}
                        trend="+5% from last week"
                        trendUp={true}
                    />
                    <KpiCard
                        title="Avg Confidence"
                        value={`${((stats?.avg_confidence || 0) * 100).toFixed(1)}%`}
                        icon={TrendingUp}
                        trend="Stable"
                        trendUp={true}
                    />
                    <KpiCard
                        title="Active Subs"
                        value={stats?.active_subscriptions || 0}
                        icon={Shield}
                        trend="2 new this week"
                        trendUp={true}
                    />
                </div>

                {/* Charts Section */}
                <div className="grid gap-4 md:grid-cols-7">

                    {/* Main Chart: Activity */}
                    <Card className="col-span-4 shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle>Analysis Activity</CardTitle>
                            <CardDescription>Number of predictions over time</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={activityData}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: '#1f2937' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorCount)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Side Chart: Disease Distribution */}
                    <Card className="col-span-3 shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle>Disease Detection</CardTitle>
                            <CardDescription>Distribution of identified diseases</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={diseaseData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {diseaseData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* New Row: Subscription Bar Chart */}
                <div className="grid gap-4 md:grid-cols-1">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle>Subscription Tiers</CardTitle>
                            <CardDescription>User distribution by plan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                        />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Section: Tables */}
                <Tabs defaultValue="users" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-white border border-gray-200">
                            <TabsTrigger value="users">Recent Users</TabsTrigger>
                            <TabsTrigger value="predictions">Recent Predictions</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="users">
                        <Card className="shadow-sm border-gray-200">
                            <CardHeader>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>Latest registered users.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Joined</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.slice(0, 5).map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-medium">{u.name}</TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={u.role === 'admin' ? 'purple' : 'gray'}>{u.role}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {u.verified ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                        )}
                                                        <span className="text-sm text-gray-600">{u.verified ? 'Verified' : 'Pending'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="predictions">
                        <Card className="shadow-sm border-gray-200">
                            <CardHeader>
                                <CardTitle>Recent Predictions</CardTitle>
                                <CardDescription>Latest AI analysis results.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Disease</TableHead>
                                            <TableHead>Confidence</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentPredictions.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono text-xs">{String(p.id).slice(0, 8)}...</TableCell>
                                                <TableCell className="font-medium text-gray-900">{p.disease}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${p.confidence * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-500">{(p.confidence * 100).toFixed(0)}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// --- Sub-components ---

function KpiCard({ title, value, icon: Icon, trend, trendUp }: any) {
    return (
        <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <p className={`text-xs ${trendUp ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
                    {trend}
                </p>
            </CardContent>
        </Card>
    );
}

function Badge({ children, variant }: { children: React.ReactNode, variant: 'purple' | 'gray' }) {
    const styles = {
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
        gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>
            {children}
        </span>
    );
}
