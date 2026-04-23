'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface AuditLogUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditLogItem {
  id: string;
  actorType: string;
  actorId: string | null;
  actorName: string;
  entityType: string;
  entityId: string | null;
  action: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  remarks: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  logs: AuditLogItem[];
  total: number;
  page: number;
  totalPages: number;
}

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────

const ACTOR_TYPES = [
  { value: '', label: 'All Actor Types' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SALES_REP', label: 'Sales Rep' },
  { value: 'AI_AGENT', label: 'AI Agent' },
  { value: 'SYSTEM', label: 'System' },
];

const ENTITY_TYPES = [
  { value: '', label: 'All Entity Types' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'CALL', label: 'Call' },
  { value: 'CONVERSATION', label: 'Conversation' },
  { value: 'FOLLOW_UP', label: 'Follow-Up' },
  { value: 'MEMBERSHIP', label: 'Membership' },
  { value: 'USER', label: 'User' },
  { value: 'SETTING', label: 'Setting' },
];

// ──────────────────────────────────────
// Badge Helpers
// ──────────────────────────────────────

const actorBadgeColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
  ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
  SALES_REP: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  AI_AGENT: 'bg-purple-100 text-purple-700 border-purple-200',
  SYSTEM: 'bg-gray-100 text-gray-600 border-gray-200',
};

const actionBadgeColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  ASSIGN: 'bg-blue-100 text-blue-700 border-blue-200',
  ESCALATE: 'bg-orange-100 text-orange-700 border-orange-200',
  STATUS_CHANGE: 'bg-violet-100 text-violet-700 border-violet-200',
};

const actorLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  SALES_REP: 'Sales Rep',
  AI_AGENT: 'AI Agent',
  SYSTEM: 'System',
};

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatFullDate(dateStr);
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function AuditLogPage({ user }: { user: AuditLogUser }) {
  const { toast } = useToast();

  // Access check
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Access Denied</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Only administrators can view the audit log.
        </p>
      </div>
    );
  }

  return <AuditLogContent />;
}

function AuditLogContent() {
  const { toast } = useToast();

  // State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actorTypeFilter, setActorTypeFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });
      if (actorTypeFilter) params.set('actorType', actorTypeFilter);
      if (entityTypeFilter) params.set('entityType', entityTypeFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (search) params.set('search', search);

      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data: AuditLogResponse = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch audit logs', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch audit logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, actorTypeFilter, entityTypeFilter, dateFrom, dateTo, search, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setActorTypeFilter('');
    setEntityTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters = actorTypeFilter || entityTypeFilter || dateFrom || dateTo || search;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Audit Log</h2>
          <p className="text-sm text-muted-foreground">
            {total} log{total !== 1 ? 's' : ''} total &middot; Read-only
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by actor name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          className="lg:hidden"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="icon" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </form>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 ${showFilters ? 'block' : 'hidden lg:flex'}`}>
        <Select
          value={actorTypeFilter}
          onValueChange={(v) => {
            setActorTypeFilter(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Actor Types" />
          </SelectTrigger>
          <SelectContent>
            {ACTOR_TYPES.map((t) => (
              <SelectItem key={t.value || '__all__'} value={t.value || '__all__'}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={entityTypeFilter}
          onValueChange={(v) => {
            setEntityTypeFilter(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Entity Types" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value || '__all__'} value={t.value || '__all__'}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-[160px]"
          placeholder="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-[160px]"
          placeholder="To date"
        />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Timestamp</TableHead>
                <TableHead className="text-xs font-semibold">Actor</TableHead>
                <TableHead className="text-xs font-semibold">Entity</TableHead>
                <TableHead className="text-xs font-semibold">Action</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Field Changed</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Old Value</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">New Value</TableHead>
                <TableHead className="text-xs font-semibold hidden xl:table-cell">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-18" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-36" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="text-center py-12">
                      <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">No audit logs yet</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        Changes will appear here automatically.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const isAiAgent = log.actorType === 'AI_AGENT';
                  return (
                    <TableRow
                      key={log.id}
                      className={`${isAiAgent ? 'bg-purple-50/40' : ''} ${
                        log.action === 'CREATE' ? 'hover:bg-green-50/30' :
                        log.action === 'DELETE' ? 'hover:bg-red-50/30' :
                        log.action === 'UPDATE' ? 'hover:bg-amber-50/30' :
                        ''
                      } transition-colors`}
                    >
                      <TableCell className="text-xs">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">{timeAgo(log.createdAt)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{formatFullDate(log.createdAt)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{log.actorName}</span>
                          {isAiAgent && <Bot className="w-3.5 h-3.5 text-purple-500" />}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${actorBadgeColors[log.actorType] ?? ''}`}
                          >
                            {actorLabels[log.actorType] ?? log.actorType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{log.entityType}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${actionBadgeColors[log.action] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.fieldChanged ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground max-w-[120px] block truncate" title={log.oldValue ?? ''}>
                          {log.oldValue ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground max-w-[120px] block truncate" title={log.newValue ?? ''}>
                          {log.newValue ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground max-w-[200px] block truncate" title={log.remarks ?? ''}>
                          {log.remarks ?? '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 25 + 1}&ndash;{Math.min(page * 25, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
