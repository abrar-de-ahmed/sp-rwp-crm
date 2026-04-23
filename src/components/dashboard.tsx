'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Phone,
  TrendingUp,
  Clock,
  Flame,
  PhoneCall,
  Wifi,
  WifiOff,
  Bot,
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DashboardProps {
  userRole: string;
  userName: string;
  userId: string;
}

interface StatsData {
  newLeads: number;
  callsToday: number;
  conversionsToday: number;
  pendingFollowUps: number;
}

interface HotLead {
  id: string;
  firstName: string;
  lastName: string;
  leadScore: number;
  temperature: string;
  status: string;
  phone: string;
  source: string;
}

interface FollowUp {
  id: string;
  dueDatetime: string;
  priority: string;
  status: string;
  leadFirstName: string;
  leadLastName: string;
  leadPhone: string;
  reason: string | null;
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

interface ChannelStatus {
  channel: string;
  status: string;
}

interface LeadSourceBreakdown {
  source: string;
  count: number;
}

interface AIAgentStatus {
  id: number;
  name: string;
  status: string;
}

interface DashboardApiResponse {
  stats: StatsData;
  hotLeads: HotLead[];
  followUps: FollowUp[];
  repPerformance?: RepPerformance[];
  channelStatuses?: ChannelStatus[];
  leadSourceBreakdown?: LeadSourceBreakdown[];
  aiAgentStatuses?: AIAgentStatus[];
  activeMemberships?: number;
  escalations?: number;
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  iconBg,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                {trendUp ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                )}
                <span className={trendUp ? 'text-emerald-600' : 'text-red-600'}>
                  {trend}
                </span>
                <span className="text-muted-foreground">vs last week</span>
              </div>
            )}
          </div>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const temperatureBadge: Record<string, { class: string; label: string }> = {
  HOT: { class: 'bg-red-100 text-red-700 border-red-200', label: 'Hot' },
  WARM: { class: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Warm' },
  COLD: { class: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Cold' },
};

const priorityBadge: Record<string, { class: string }> = {
  URGENT: { class: 'bg-red-100 text-red-700 border-red-200' },
  HIGH: { class: 'bg-orange-100 text-orange-700 border-orange-200' },
  NORMAL: { class: 'bg-sky-100 text-sky-700 border-sky-200' },
  LOW: { class: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export default function Dashboard({ userRole, userName, userId }: DashboardProps) {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-1" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {greeting()}, {userName}! 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          {isAdmin
            ? "Here's your team's performance overview for today."
            : "Here's your sales activity overview for today."}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={isAdmin ? 'Total Leads' : 'New Leads'}
          value={data?.stats.newLeads ?? 0}
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          trend="+12%"
          trendUp={true}
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Calls Today"
          value={data?.stats.callsToday ?? 0}
          icon={<Phone className="w-5 h-5 text-blue-600" />}
          trend="+8%"
          trendUp={true}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Conversions"
          value={data?.stats.conversionsToday ?? 0}
          icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
          trend="+24%"
          trendUp={true}
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Pending Follow-Ups"
          value={data?.stats.pendingFollowUps ?? 0}
          icon={<Clock className="w-5 h-5 text-purple-600" />}
          trend="-3%"
          trendUp={false}
          iconBg="bg-purple-50"
        />
      </div>

      {/* Hot Leads + Follow-Ups Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot Leads */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <CardTitle className="text-base">Hot Leads</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {data?.hotLeads.length ?? 0} leads
              </Badge>
            </div>
            <CardDescription>
              Leads with high temperature that need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.hotLeads.length > 0 ? (
              <div className="space-y-3">
                {data.hotLeads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600 text-sm font-semibold">
                        {lead.firstName[0]}
                        {lead.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Score: {lead.leadScore} &middot; {lead.source}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${temperatureBadge[lead.temperature]?.class ?? ''}`}
                      >
                        {temperatureBadge[lead.temperature]?.label ?? lead.temperature}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                        <PhoneCall className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Flame className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No hot leads at the moment
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Follow-Ups */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-base">Upcoming Follow-Ups</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {data?.followUps.length ?? 0} pending
              </Badge>
            </div>
            <CardDescription>
              Scheduled follow-ups due soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.followUps.length > 0 ? (
              <div className="space-y-3">
                {data.followUps.slice(0, 5).map((fu) => (
                  <div
                    key={fu.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-amber-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-sm font-semibold">
                        {fu.leadFirstName[0]}
                        {fu.leadLastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {fu.leadFirstName} {fu.leadLastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(fu.dueDatetime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${priorityBadge[fu.priority]?.class ?? ''}`}
                    >
                      {fu.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No upcoming follow-ups
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Section: Rep Performance */}
      {isAdmin && data?.repPerformance && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-base">Rep Performance</CardTitle>
            </div>
            <CardDescription>
              Team member performance overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Calls Made</TableHead>
                    <TableHead className="text-center">Answered</TableHead>
                    <TableHead className="text-center">Conversions</TableHead>
                    <TableHead className="text-center">Avg Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.repPerformance.map((rep) => (
                    <TableRow key={rep.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{rep.name}</p>
                          <p className="text-xs text-muted-foreground">{rep.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{rep.callsMade}</TableCell>
                      <TableCell className="text-center">{rep.callsAnswered}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="w-3 h-3 text-emerald-500" />
                          {rep.conversions}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{rep.avgResponseTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Section: Escalations */}
      {isAdmin && (data?.escalations ?? 0) > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-red-800">
                  {data?.escalations} Escalated Follow-Up{((data?.escalations ?? 0) !== 1) ? 's' : ''}
                </p>
                <p className="text-xs text-red-600">
                  Requires your immediate attention
                </p>
              </div>
              <Button size="sm" variant="outline" className="ml-auto border-red-200 text-red-700 hover:bg-red-100">
                View All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Super Admin Section: System Health + Lead Sources + AI Agents */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Channel Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base">Channel Status</CardTitle>
              </div>
              <CardDescription>Integration connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.channelStatuses?.map((ch) => (
                  <div
                    key={ch.channel}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      {ch.status === 'CONNECTED' ? (
                        <Wifi className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-sm font-medium">{ch.channel}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        ch.status === 'CONNECTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {ch.status === 'CONNECTED' ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lead Source Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">Lead Sources</CardTitle>
              </div>
              <CardDescription>Leads by acquisition channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.leadSourceBreakdown?.map((ls) => (
                  <div key={ls.source} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{ls.source}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (ls.count / Math.max(1, (data?.leadSourceBreakdown?.reduce((a, b) => a + b.count, 0) ?? 1))) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-6 text-right">{ls.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Agent Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-base">AI Agents</CardTitle>
              </div>
              <CardDescription>Automated agent status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.aiAgentStatuses?.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${agent.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-300'}`}
                      />
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        agent.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                          : 'bg-gray-50 text-gray-500 border-gray-200 text-xs'
                      }
                    >
                      {agent.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Super Admin: Active Memberships */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-emerald-50">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Memberships</p>
                  <p className="text-2xl font-bold">{data?.activeMemberships ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
