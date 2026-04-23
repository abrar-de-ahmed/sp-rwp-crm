'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
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

interface CallHistoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CallItem {
  id: string;
  leadId: string;
  repId: string;
  direction: string;
  callTimestamp: string;
  durationSeconds: number;
  outcome: string;
  aiSummary: string | null;
  repRemarks: string | null;
  createdAt: string;
  lead: { id: string; firstName: string; lastName: string };
  rep: { id: string; name: string };
}

interface CallsResponse {
  calls: CallItem[];
  total: number;
  page: number;
  totalPages: number;
}

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────

const OUTCOMES = [
  { value: '', label: 'All Outcomes' },
  { value: 'ANSWERED', label: 'Answered' },
  { value: 'HUNG_UP_BY_CUSTOMER', label: 'Hung Up by Customer' },
  { value: 'HUNG_UP_BY_REP', label: 'Hung Up by Rep' },
  { value: 'UNANSWERED', label: 'Unanswered' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number' },
  { value: 'VOICEMAIL', label: 'Voicemail' },
];

const DIRECTIONS = [
  { value: '', label: 'All Directions' },
  { value: 'OUTBOUND', label: 'Outbound' },
  { value: 'INBOUND', label: 'Inbound' },
];

const outcomeBadgeColors: Record<string, string> = {
  ANSWERED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  HUNG_UP_BY_CUSTOMER: 'bg-amber-100 text-amber-700 border-amber-200',
  HUNG_UP_BY_REP: 'bg-orange-100 text-orange-700 border-orange-200',
  UNANSWERED: 'bg-red-100 text-red-700 border-red-200',
  BUSY: 'bg-gray-100 text-gray-600 border-gray-200',
  WRONG_NUMBER: 'bg-red-100 text-red-600 border-red-200',
  VOICEMAIL: 'bg-blue-100 text-blue-700 border-blue-200',
};

const outcomeLabels: Record<string, string> = {
  ANSWERED: 'Answered',
  HUNG_UP_BY_CUSTOMER: 'Customer Hung Up',
  HUNG_UP_BY_REP: 'Rep Hung Up',
  UNANSWERED: 'Unanswered',
  BUSY: 'Busy',
  WRONG_NUMBER: 'Wrong Number',
  VOICEMAIL: 'Voicemail',
};

const directionBadgeColors: Record<string, string> = {
  OUTBOUND: 'bg-sky-100 text-sky-700 border-sky-200',
  INBOUND: 'bg-emerald-100 text-emerald-700 border-emerald-200',
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
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function CallHistoryPage({
  user,
  onNavigateToLead,
}: {
  user: CallHistoryUser;
  onNavigateToLead?: (leadId: string) => void;
}) {
  const { toast } = useToast();

  // State
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Fetch calls
  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });
      if (outcomeFilter) params.set('outcome', outcomeFilter);
      if (directionFilter) params.set('direction', directionFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (search) params.set('search', search);

      const res = await fetch(`/api/calls?${params}`);
      if (res.ok) {
        const data: CallsResponse = await res.json();
        setCalls(data.calls);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch call history', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch call history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, outcomeFilter, directionFilter, dateFrom, dateTo, search, toast]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setOutcomeFilter('');
    setDirectionFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters = outcomeFilter || directionFilter || dateFrom || dateTo || search;

  const toggleExpand = (callId: string) => {
    setExpandedCallId((prev) => (prev === callId ? null : callId));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Call History</h2>
          <p className="text-sm text-muted-foreground">
            {total} call{total !== 1 ? 's' : ''} total
            {user.role === 'SUPER_ADMIN'
              ? ' (All team)'
              : user.role === 'ADMIN'
                ? ' (Team)'
                : ' (My calls)'}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by lead name..."
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
          value={outcomeFilter}
          onValueChange={(v) => {
            setOutcomeFilter(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Outcomes" />
          </SelectTrigger>
          <SelectContent>
            {OUTCOMES.map((o) => (
              <SelectItem key={o.value || '__all__'} value={o.value || '__all__'}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={directionFilter}
          onValueChange={(v) => {
            setDirectionFilter(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Directions" />
          </SelectTrigger>
          <SelectContent>
            {DIRECTIONS.map((d) => (
              <SelectItem key={d.value || '__all__'} value={d.value || '__all__'}>
                {d.label}
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
                <TableHead className="text-xs font-semibold">Date/Time</TableHead>
                <TableHead className="text-xs font-semibold">Lead</TableHead>
                <TableHead className="text-xs font-semibold">Direction</TableHead>
                <TableHead className="text-xs font-semibold">Duration</TableHead>
                <TableHead className="text-xs font-semibold">Outcome</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">AI Summary</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Rep Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-18" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-36" /></TableCell>
                  </TableRow>
                ))
              ) : calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="text-center py-12">
                      <Phone className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">No call history found</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {hasActiveFilters
                          ? 'Try adjusting your filters or search query.'
                          : 'Call records will appear here after calls are made.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                calls.map((call) => {
                  const isExpanded = expandedCallId === call.id;
                  return (
                    <>
                      <TableRow
                        key={call.id}
                        className="cursor-pointer hover:bg-emerald-50/50 transition-colors"
                        onClick={() => onNavigateToLead?.(call.leadId)}
                      >
                        <TableCell className="text-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  {timeAgo(call.callTimestamp)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{formatFullDate(call.callTimestamp)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-foreground">
                            {call.lead.firstName} {call.lead.lastName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${directionBadgeColors[call.direction] ?? ''}`}
                          >
                            {call.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatDuration(call.durationSeconds)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${outcomeBadgeColors[call.outcome] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            {outcomeLabels[call.outcome] ?? call.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {call.aiSummary ? (
                            <div className="flex items-start gap-1" onClick={(e) => { e.stopPropagation(); toggleExpand(call.id); }}>
                              <span
                                className="text-xs text-muted-foreground max-w-[200px] block truncate"
                              >
                                {isExpanded ? call.aiSummary : call.aiSummary.length > 60 ? `${call.aiSummary.slice(0, 60)}...` : call.aiSummary}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 flex-shrink-0"
                                onClick={(e) => { e.stopPropagation(); toggleExpand(call.id); }}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground block max-w-[180px] truncate">
                                  {call.repRemarks ?? '—'}
                                </span>
                              </TooltipTrigger>
                              {call.repRemarks && (
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">{call.repRemarks}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                      {/* Expanded AI Summary row */}
                      {isExpanded && call.aiSummary && (
                        <TableRow key={`${call.id}-expanded`} className="bg-emerald-50/30">
                          <TableCell colSpan={7} className="px-6 py-3">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-emerald-700 flex-shrink-0 mt-0.5">
                                AI Summary:
                              </span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {call.aiSummary}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
