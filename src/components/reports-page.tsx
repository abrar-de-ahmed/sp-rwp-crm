'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Download,
  FileJson,
  FileSpreadsheet,
  Bot,
  Loader2,
  Users,
  TrendingUp,
  Target,
  Clock,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardStats {
  stats: {
    newLeads: number;
    callsToday: number;
    conversionsToday: number;
    pendingFollowUps: number;
  };
  hotLeads: { id: string; firstName: string; lastName: string; leadScore: number; temperature: string; status: string; phone: string; source: string }[];
  followUps: { id: string; dueDatetime: string; priority: string; status: string; leadFirstName: string; leadLastName: string; leadPhone: string; reason: string | null }[];
  repPerformance?: { id: string; name: string; email: string; callsMade: number; callsAnswered: number; conversions: number; avgResponseTime: string }[];
  leadSourceBreakdown?: { source: string; count: number }[];
  escalations?: number;
  activeMemberships?: number;
}

interface AIReport {
  report: {
    summary: string;
    metrics: Record<string, unknown>;
    trends: { metric: string; observation: string }[];
    topReps: { name: string; calls: number; conversions: number }[];
    recommendations: string[];
    pipelineHealth: string;
    detailedReport: string;
  };
  period: string;
  generatedAt: string;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];

export default function ReportsPage({ user }: { user: User }) {
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
          <p className="text-muted-foreground mt-3">Access Denied. Admin only.</p>
        </div>
      </div>
    );
  }

  const { toast } = useToast();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leadsData, setLeadsData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Report state
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load stats', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads?limit=1000');
      if (res.ok) {
        const json = await res.json();
        setLeadsData(json.leads ?? []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLeads();
  }, [fetchStats, fetchLeads]);

  // Generate AI Report
  const handleGenerateReport = async () => {
    setAiReportLoading(true);
    setAiReport(null);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      if (res.ok) {
        const json = await res.json();
        setAiReport(json);
      } else {
        toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    } finally {
      setAiReportLoading(false);
    }
  };

  // Export as CSV
  const exportCSV = () => {
    if (leadsData.length === 0) {
      toast({ title: 'No Data', description: 'No leads to export' });
      return;
    }

    const headers = 'Lead Name,Phone,Email,Source,Type,Score,Temperature,Status,Assigned Rep,Created Date';
    const rows = leadsData.map((lead) => {
      const l = lead as Record<string, unknown>;
      const name = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim();
      const assignedRep = (l.assignedRep as Record<string, unknown>)?.name ?? '';
      const createdDate = l.createdAt ? format(new Date(l.createdAt as string), 'yyyy-MM-dd') : '';
      const row = [name, l.phone ?? '', l.email ?? '', l.source ?? '', l.leadType ?? '', l.leadScore ?? '', l.temperature ?? '', l.status ?? '', assignedRep, createdDate];
      return row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-leads-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'CSV file downloaded successfully' });
  };

  // Export as JSON
  const exportJSON = () => {
    if (leadsData.length === 0) {
      toast({ title: 'No Data', description: 'No leads to export' });
      return;
    }
    const json = JSON.stringify(leadsData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-leads-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'JSON file downloaded successfully' });
  };

  // KPI values derived from stats
  const totalLeads = leadsData.length;
  const conversions = stats?.stats.conversionsToday ?? 0;
  const conversionRate = totalLeads > 0 ? ((conversions / totalLeads) * 100).toFixed(1) : '0.0';
  const avgLeadScore = leadsData.length > 0
    ? (leadsData.reduce((sum, l) => sum + (Number((l as Record<string, unknown>).leadScore) || 0), 0) / leadsData.length).toFixed(0)
    : '0';
  const activeFollowUps = stats?.stats.pendingFollowUps ?? 0;
  const escalations = stats?.escalations ?? 0;

  // Lead status distribution
  const statusDistribution = (() => {
    const counts: Record<string, number> = {};
    leadsData.forEach((l) => {
      const status = (l as Record<string, unknown>).status as string ?? 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const STATUS_COLORS: Record<string, string> = {
    NEW: '#3b82f6',
    CONTACTED: '#6366f1',
    FOLLOW_UP: '#f59e0b',
    BOOKED: '#10b981',
    LOST: '#ef4444',
  };

  // Pipeline health badge
  const pipelineHealthColor: Record<string, string> = {
    HEALTHY: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    WARNING: 'bg-amber-100 text-amber-700 border-amber-200',
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Reports & Analytics
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive performance data and AI-powered insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export as CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} className="gap-2">
            <FileJson className="w-4 h-4" />
            Export as JSON
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as 'daily' | 'weekly' | 'monthly')}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Leads</p>
                <p className="text-xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversions</p>
                <p className="text-xl font-bold">{conversions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 p-2">
                <Target className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conv. Rate</p>
                <p className="text-xl font-bold">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <Activity className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Lead Score</p>
                <p className="text-xl font-bold">{avgLeadScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Follow-Ups</p>
                <p className="text-xl font-bold">{activeFollowUps}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${escalations > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <AlertTriangle className={`w-4 h-4 ${escalations > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Escalations</p>
                <p className={`text-xl font-bold ${escalations > 0 ? 'text-red-600' : ''}`}>{escalations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Source Breakdown - Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lead Source Breakdown</CardTitle>
            <CardDescription>Distribution of leads by acquisition channel</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.leadSourceBreakdown && stats.leadSourceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.leadSourceBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ source, percent }) => `${source}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="source"
                  >
                    {stats.leadSourceBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No lead source data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rep Performance - Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rep Performance Comparison</CardTitle>
            <CardDescription>Calls made vs conversions per sales rep</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.repPerformance && stats.repPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.repPerformance} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="callsMade" name="Calls" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversions" name="Conversions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No rep performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lead Status Distribution</CardTitle>
          <CardDescription>Breakdown of leads by pipeline status</CardDescription>
        </CardHeader>
        <CardContent>
          {statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                  {statusDistribution.map((entry) => (
                    <Cell key={`status-${entry.name}`} fill={STATUS_COLORS[entry.name] ?? '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No lead status data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Report Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-600" />
                AI-Powered Report
              </CardTitle>
              <CardDescription>Generate an AI analysis for the selected period</CardDescription>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={aiReportLoading}
              className="gap-2"
            >
              {aiReportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  Generate AI Report
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiReportLoading && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
          {aiReport && !aiReportLoading && (
            <div className="space-y-4">
              {/* Pipeline Health Badge */}
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={pipelineHealthColor[aiReport.report.pipelineHealth] ?? 'bg-gray-100 text-gray-700 border-gray-200'}
                >
                  Pipeline: {aiReport.report.pipelineHealth}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Generated: {aiReport.generatedAt ? format(new Date(aiReport.generatedAt), 'PPpp') : '—'}
                </span>
              </div>

              {/* Executive Summary */}
              <div>
                <h4 className="font-semibold text-sm mb-1">Executive Summary</h4>
                <p className="text-sm text-muted-foreground">{aiReport.report.summary}</p>
              </div>

              {/* Recommendations */}
              {aiReport.report.recommendations && aiReport.report.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                  <ul className="space-y-1.5">
                    {aiReport.report.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-emerald-500 mt-1 shrink-0">&#8226;</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full Markdown Report */}
              {aiReport.report.detailedReport && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2">Detailed Report</h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h4]:text-sm [&_p]:text-sm [&_ul]:text-sm [&_li]:text-sm [&_strong]:text-foreground">
                    <ReactMarkdown>{aiReport.report.detailedReport}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
          {!aiReport && !aiReportLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" />
              Click &quot;Generate AI Report&quot; to get an AI-powered analysis for the {period} period.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
