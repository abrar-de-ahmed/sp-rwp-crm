'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Phone,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Medal,
  Award,
  BarChart3,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface PlaceholderUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface RepPerformance {
  id: string;
  name: string;
  email: string;
  callsMade: number;
  callsAnswered: number;
  conversions: number;
  avgResponseTime: string;
}

interface DashboardStats {
  stats: {
    newLeads: number;
    callsToday: number;
    conversionsToday: number;
    pendingFollowUps: number;
  };
  repPerformance: RepPerformance[];
  escalations: number;
  hotLeads: unknown[];
  followUps: unknown[];
}

interface PipelineData {
  columns: Record<string, unknown[]>;
}

type DateRange = 'today' | 'week' | 'month';

export default function TeamPage({ user }: { user: PlaceholderUser }) {
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Role guard: ADMIN and SUPER_ADMIN only
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">Team Overview is available to Admins and Super Admins only.</p>
      </div>
    );
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, pipelineRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/pipeline'),
        ]);
        if (!statsRes.ok || !pipelineRes.ok) throw new Error('Failed to fetch data');
        const statsJson = await statsRes.json();
        const pipelineJson = await pipelineRes.json();
        setStats(statsJson);
        setPipelineData(pipelineJson);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange, retryCount]);

  const summaryCards = useMemo(() => {
    if (!stats) return [];
    const totalReps = stats.repPerformance?.length ?? 0;
    return [
      {
        title: 'Total Reps',
        value: totalReps,
        icon: Users,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        title: 'Total Calls Today',
        value: stats.stats.callsToday,
        icon: Phone,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        title: 'Conversions Today',
        value: stats.stats.conversionsToday,
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        title: 'Active Escalations',
        value: stats.escalations ?? 0,
        icon: AlertTriangle,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
    ];
  }, [stats]);

  const leaderboard = useMemo(() => {
    if (!stats?.repPerformance) return [];
    return [...stats.repPerformance]
      .sort((a, b) => b.conversions - a.conversions || b.callsMade - a.callsMade)
      .slice(0, 3);
  }, [stats]);

  const chartData = useMemo(() => {
    if (!stats?.repPerformance) return [];
    return stats.repPerformance.map((rep) => ({
      name: rep.name.split(' ')[0],
      fullName: rep.name,
      'Calls Made': rep.callsMade,
      'Calls Answered': rep.callsAnswered,
    }));
  }, [stats]);

  const funnelData = useMemo(() => {
    if (!pipelineData?.columns) return [];
    const stages = ['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATION', 'BOOKED'];
    const labels: Record<string, string> = {
      NEW: 'New',
      CONTACTED: 'Contacted',
      INTERESTED: 'Interested',
      NEGOTIATION: 'Negotiation',
      BOOKED: 'Booked',
    };
    const colors = ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981'];
    return stages.map((stage, idx) => ({
      stage: labels[stage] ?? stage,
      count: pipelineData.columns[stage]?.length ?? 0,
      fill: colors[idx],
    }));
  }, [pipelineData]);

  function getStatusBadge(callsMade: number, conversions: number) {
    if (callsMade === 0) return <Badge variant="outline" className="text-gray-500">Idle</Badge>;
    const rate = (conversions / callsMade) * 100;
    if (rate >= 30) return <Badge className="bg-emerald-600 hover:bg-emerald-700">Star</Badge>;
    if (rate >= 15) return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
    if (rate >= 5) return <Badge variant="outline" className="text-amber-600 border-amber-300">Warming</Badge>;
    return <Badge variant="outline" className="text-red-500 border-red-300">Needs Coaching</Badge>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load team data: {error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setRetryCount((c) => c + 1);
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Team Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor team performance, call metrics, and conversion rates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((card) => (
              <Card key={card.title} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${card.bg}`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-emerald-50">
          <TabsTrigger value="performance" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            Performance
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="charts" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            Charts
          </TabsTrigger>
        </TabsList>

        {/* Performance Table */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Rep Performance
              </CardTitle>
              <CardDescription>
                Detailed call metrics and conversion rates for each team member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !stats?.repPerformance?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No team performance data available yet.</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Calls Made</TableHead>
                        <TableHead className="text-center">Calls Answered</TableHead>
                        <TableHead className="text-center">Conversions</TableHead>
                        <TableHead className="text-center">Conv. Rate</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.repPerformance.map((rep) => {
                        const rate = rep.callsMade > 0 ? ((rep.conversions / rep.callsMade) * 100).toFixed(1) : '0.0';
                        return (
                          <TableRow key={rep.id} className="hover:bg-emerald-50/50">
                            <TableCell>
                              <div>
                                <p className="font-medium">{rep.name}</p>
                                <p className="text-xs text-muted-foreground">{rep.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">{rep.callsMade}</TableCell>
                            <TableCell className="text-center font-medium">{rep.callsAnswered}</TableCell>
                            <TableCell className="text-center font-medium text-emerald-600">{rep.conversions}</TableCell>
                            <TableCell className="text-center">
                              <span className="font-mono text-sm">{rate}%</span>
                            </TableCell>
                            <TableCell className="text-center">{getStatusBadge(rep.callsMade, rep.conversions)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-600" />
                Top Performers
              </CardTitle>
              <CardDescription>
                Top 3 reps ranked by conversions and call volume.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-2xl" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No leaderboard data available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {leaderboard.map((rep, idx) => {
                    const medals: { icon: typeof Trophy; color: string; bg: string; ring: string; label: string }[] = [
                      { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50', ring: 'ring-yellow-300', label: '1st Place' },
                      { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50', ring: 'ring-gray-300', label: '2nd Place' },
                      { icon: Award, color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-300', label: '3rd Place' },
                    ];
                    const medal = medals[idx];
                    const Icon = medal.icon;
                    const rate = rep.callsMade > 0 ? ((rep.conversions / rep.callsMade) * 100).toFixed(1) : '0.0';
                    return (
                      <Card
                        key={rep.id}
                        className={`relative overflow-hidden border-2 ${medal.ring} ${medal.bg} hover:shadow-lg transition-shadow`}
                      >
                        <CardContent className="pt-6 text-center">
                          <div className="flex justify-center mb-3">
                            <Icon className={`w-10 h-10 ${medal.color}`} />
                          </div>
                          <Badge variant="outline" className={`${medal.color} border-current mb-3`}>
                            {medal.label}
                          </Badge>
                          <h3 className="text-lg font-bold mt-2">{rep.name}</h3>
                          <p className="text-xs text-muted-foreground mb-4">{rep.email}</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white/80 rounded-lg p-2">
                              <p className="text-lg font-bold text-emerald-600">{rep.callsMade}</p>
                              <p className="text-xs text-muted-foreground">Calls</p>
                            </div>
                            <div className="bg-white/80 rounded-lg p-2">
                              <p className="text-lg font-bold text-emerald-600">{rep.conversions}</p>
                              <p className="text-xs text-muted-foreground">Conv.</p>
                            </div>
                            <div className="bg-white/80 rounded-lg p-2">
                              <p className="text-lg font-bold text-emerald-600">{rate}%</p>
                              <p className="text-xs text-muted-foreground">Rate</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts" className="space-y-4">
          {/* Calls Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Calls Per Rep
              </CardTitle>
              <CardDescription>
                Calls Made (green) vs Calls Answered (blue) by each representative.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : chartData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No chart data available yet.</p>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number, name: string) => [value, name]}
                        labelFormatter={(label: string) => {
                          const item = chartData.find((d) => d.name === label);
                          return item?.fullName ?? label;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Calls Made" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Calls Answered" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Conversion Funnel
              </CardTitle>
              <CardDescription>
                Lead progression through the sales pipeline stages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : funnelData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No funnel data available yet.</p>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 13, fontWeight: 500 }} width={90} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]} barSize={32}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
