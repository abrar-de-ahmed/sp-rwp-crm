'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Eye,
  Phone,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  X,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import LeadDetail from '@/components/lead-detail';
import CreateLeadDialog from '@/components/create-lead-dialog';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types & Constants
// ──────────────────────────────────────

interface LeadUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LeadListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  source: string;
  leadType: string;
  leadScore: number;
  temperature: string;
  status: string;
  assignedRepId: string | null;
  assignedRep: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadsResponse {
  leads: LeadListItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface LeadsPageProps {
  user: LeadUser;
}

const SOURCES = [
  { value: '', label: 'All Sources' },
  { value: 'META_AD', label: 'Meta Ad' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WALK_IN', label: 'Walk-In' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'MANUAL_IMPORT', label: 'Manual Import' },
];

const TEMPERATURES = [
  { value: '', label: 'All Temperatures' },
  { value: 'HOT', label: 'Hot' },
  { value: 'WARM', label: 'Warm' },
  { value: 'COLD', label: 'Cold' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'LOST', label: 'Lost' },
  { value: 'RECOVERED', label: 'Recovered' },
];

const LEAD_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'MEMBERSHIP', label: 'Membership' },
  { value: 'DAY_PASS', label: 'Day Pass' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'EVENT', label: 'Event' },
  { value: 'CORPORATE_EVENT', label: 'Corporate Event' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'CAMP', label: 'Camp' },
  { value: 'OTHER', label: 'Other' },
];

// ──────────────────────────────────────
// Badge Helpers
// ──────────────────────────────────────

const sourceBadgeColors: Record<string, string> = {
  META_AD: 'bg-violet-100 text-violet-700 border-violet-200',
  WHATSAPP: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INSTAGRAM: 'bg-pink-100 text-pink-700 border-pink-200',
  FACEBOOK: 'bg-blue-100 text-blue-700 border-blue-200',
  WEBSITE: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  WALK_IN: 'bg-amber-100 text-amber-700 border-amber-200',
  REFERRAL: 'bg-teal-100 text-teal-700 border-teal-200',
  MANUAL_IMPORT: 'bg-slate-100 text-slate-600 border-slate-200',
};

const temperatureBadgeColors: Record<string, string> = {
  HOT: 'bg-red-100 text-red-700 border-red-200',
  WARM: 'bg-amber-100 text-amber-700 border-amber-200',
  COLD: 'bg-sky-100 text-sky-700 border-sky-200',
};

const statusBadgeColors: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700 border-slate-200',
  CONTACTED: 'bg-blue-100 text-blue-700 border-blue-200',
  INTERESTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  NEGOTIATION: 'bg-amber-100 text-amber-700 border-amber-200',
  BOOKED: 'bg-green-100 text-green-700 border-green-200',
  LOST: 'bg-red-100 text-red-700 border-red-200',
  RECOVERED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const sourceLabels: Record<string, string> = {
  META_AD: 'Meta Ad',
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  WEBSITE: 'Website',
  WALK_IN: 'Walk-In',
  REFERRAL: 'Referral',
  MANUAL_IMPORT: 'Manual',
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-emerald-100 text-emerald-700'
      : score >= 50
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';
  return (
    <Badge variant="outline" className={`text-xs font-mono ${color}`}>
      {score}
    </Badge>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeAgo(dateStr: string) {
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
  return formatDate(dateStr);
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function LeadsPage({ user }: LeadsPageProps) {
  const { toast } = useToast();

  // State
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [tempFilter, setTempFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (sourceFilter) params.set('source', sourceFilter);
      if (tempFilter) params.set('temperature', tempFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (leadTypeFilter) params.set('leadType', leadTypeFilter);

      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data: LeadsResponse = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch leads', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceFilter, tempFilter, statusFilter, leadTypeFilter, toast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setSourceFilter('');
    setTempFilter('');
    setStatusFilter('');
    setLeadTypeFilter('');
    setPage(1);
  };

  const hasActiveFilters = search || sourceFilter || tempFilter || statusFilter || leadTypeFilter;

  // Lead detail view
  if (selectedLeadId) {
    return (
      <LeadDetail
        leadId={selectedLeadId}
        user={user}
        onBack={() => setSelectedLeadId(null)}
        onLeadUpdated={fetchLeads}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {user.role === 'SALES_REP' ? 'My Leads' : 'Lead Management'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {total} lead{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {/* Mobile filter toggle */}
        <Button
          type="button"
          variant="outline"
          className="lg:hidden"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
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

      {/* Filter Row */}
      <div className={`flex flex-wrap gap-3 ${showMobileFilters ? 'block' : 'hidden lg:flex'}`}>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => (
              <SelectItem key={s.value || '__all__'} value={s.value || '__all__'}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tempFilter} onValueChange={(v) => { setTempFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Temperatures" />
          </SelectTrigger>
          <SelectContent>
            {TEMPERATURES.map((t) => (
              <SelectItem key={t.value || '__all__'} value={t.value || '__all__'}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value || '__all__'} value={s.value || '__all__'}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={leadTypeFilter} onValueChange={(v) => { setLeadTypeFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_TYPES.map((lt) => (
              <SelectItem key={lt.value || '__all__'} value={lt.value || '__all__'}>
                {lt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Name</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Phone</TableHead>
                <TableHead className="text-xs font-semibold">Source</TableHead>
                <TableHead className="text-xs font-semibold">Temp</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Score</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Assigned Rep</TableHead>
                <TableHead className="text-xs font-semibold hidden xl:table-cell">Updated</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="text-center py-12">
                      <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">No leads found</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {hasActiveFilters
                          ? 'Try adjusting your filters or search query.'
                          : 'Click "Add Lead" to create your first lead.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-emerald-50/50 transition-colors"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {lead.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{lead.phone}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${sourceBadgeColors[lead.source] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {sourceLabels[lead.source] ?? lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${temperatureBadgeColors[lead.temperature] ?? ''}`}
                      >
                        {lead.temperature}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusBadgeColors[lead.status] ?? ''}`}
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <ScoreBadge score={lead.leadScore} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {lead.assignedRep?.name ?? 'Unassigned'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(lead.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeadId(lead.id);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`tel:${lead.phone}`, '_self');
                                }}
                              >
                                <Phone className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Call Lead</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} leads
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

      {/* Create Lead Dialog */}
      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={user.id}
        userRole={user.role}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
