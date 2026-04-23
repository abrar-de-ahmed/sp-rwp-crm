'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  CheckCircle2,
  Eye,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Loader2,
  AlarmClock,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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
import CreateFollowupDialog from '@/components/create-followup-dialog';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface FollowUpUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface FollowUpItem {
  id: string;
  leadId: string;
  dueDatetime: string;
  priority: string;
  status: string;
  reason: string | null;
  lastCallSummary: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  escalatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string } | null;
  lead: { id: string; firstName: string; lastName: string } | null;
  escalatedTo: { id: string; name: string } | null;
}

interface FollowUpsResponse {
  followUps: FollowUpItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface FollowUpsPageProps {
  user: FollowUpUser;
  onNavigateToLead?: (leadId: string) => void;
}

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'MISSED', label: 'Missed' },
  { value: 'ESCALATED', label: 'Escalated' },
];

const priorityBadgeColors: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  NORMAL: 'bg-sky-100 text-sky-700 border-sky-200',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

const statusBadgeColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  MISSED: 'bg-red-100 text-red-700 border-red-200',
  ESCALATED: 'bg-purple-100 text-purple-700 border-purple-200',
};

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isOverdue(dueDatetime: string, status: string): boolean {
  if (status !== 'PENDING') return false;
  return new Date(dueDatetime) < new Date();
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function FollowUpsPage({ user, onNavigateToLead }: FollowUpsPageProps) {
  const { toast } = useToast();

  // State
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [snoozeDate, setSnoozeDate] = useState('');
  const [snoozeTime, setSnoozeTime] = useState('');
  const [escalateToId, setEscalateToId] = useState('');
  const [escalateNotes, setEscalateNotes] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch follow-ups
  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);

      const res = await fetch(`/api/followups?${params}`);
      if (res.ok) {
        const data: FollowUpsResponse = await res.json();
        setFollowUps(data.followUps);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch follow-ups', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, toast]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Fetch team members for escalation dialog
  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/leads?limit=1');
      // We need a team endpoint — just fetch all active users for now
      // Use a simple approach: filter assigned reps from existing data
      if (res.ok) {
        const users = new Map<string, string>();
        followUps.forEach((fu) => {
          if (fu.assignedTo && !users.has(fu.assignedTo.id)) {
            users.set(fu.assignedTo.id, fu.assignedTo.name);
          }
        });
        // Add current user if admin
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          users.set(user.id, user.name);
        }
        setTeamMembers(
          Array.from(users.entries()).map(([id, name]) => ({ id, name })),
        );
      }
    } catch {
      // silent
    }
  }, [followUps, user]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter]);

  // Complete follow-up
  const handleComplete = async () => {
    if (!selectedFollowUp) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/followups/${selectedFollowUp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          completionNotes: completionNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: 'Completed', description: 'Follow-up marked as completed.' });
        setCompleteOpen(false);
        setCompletionNotes('');
        setSelectedFollowUp(null);
        fetchFollowUps();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to complete', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to complete follow-up', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Mark as missed
  const handleMarkMissed = async (fu: FollowUpItem) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/followups/${fu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'MISSED' }),
      });
      if (res.ok) {
        toast({ title: 'Missed', description: 'Follow-up marked as missed.' });
        fetchFollowUps();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update follow-up', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Snooze (reschedule)
  const handleSnooze = async () => {
    if (!selectedFollowUp || !snoozeDate || !snoozeTime) return;
    setActionLoading(true);
    try {
      const dueDatetime = new Date(`${snoozeDate}T${snoozeTime}`).toISOString();
      const res = await fetch(`/api/followups/${selectedFollowUp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDatetime }),
      });
      if (res.ok) {
        toast({ title: 'Rescheduled', description: 'Follow-up has been rescheduled.' });
        setSnoozeOpen(false);
        setSnoozeDate('');
        setSnoozeTime('');
        setSelectedFollowUp(null);
        fetchFollowUps();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to reschedule', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to reschedule follow-up', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Escalate
  const handleEscalate = async () => {
    if (!selectedFollowUp) return;
    setActionLoading(true);
    try {
      const body: Record<string, string> = { status: 'ESCALATED' };
      if (escalateToId) body.escalatedToId = escalateToId;
      const res = await fetch(`/api/followups/${selectedFollowUp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast({ title: 'Escalated', description: 'Follow-up has been escalated.' });
        setEscalateOpen(false);
        setEscalateToId('');
        setEscalateNotes('');
        setSelectedFollowUp(null);
        fetchFollowUps();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to escalate', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to escalate follow-up', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open snooze with defaults
  const openSnoozeDialog = (fu: FollowUpItem) => {
    setSelectedFollowUp(fu);
    // Default: tomorrow at same time
    const tomorrow = new Date(fu.dueDatetime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSnoozeDate(tomorrow.toISOString().split('T')[0]);
    setSnoozeTime(
      `${String(tomorrow.getHours()).padStart(2, '0')}:${String(tomorrow.getMinutes()).padStart(2, '0')}`,
    );
    setSnoozeOpen(true);
  };

  // Open complete dialog
  const openCompleteDialog = (fu: FollowUpItem) => {
    setSelectedFollowUp(fu);
    setCompletionNotes('');
    setCompleteOpen(true);
  };

  // Open escalate dialog
  const openEscalateDialog = (fu: FollowUpItem) => {
    setSelectedFollowUp(fu);
    setEscalateToId('');
    setEscalateNotes('');
    fetchTeamMembers();
    setEscalateOpen(true);
  };

  const activeFilterCount = [statusFilter, priorityFilter].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Follow-Ups</h2>
          <p className="text-sm text-muted-foreground">
            {total} follow-up{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Follow-Up
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Priority Filter */}
      <div className="flex items-center gap-3">
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Priorities</SelectItem>
            <SelectItem value="URGENT">URGENT</SelectItem>
            <SelectItem value="HIGH">HIGH</SelectItem>
            <SelectItem value="NORMAL">NORMAL</SelectItem>
            <SelectItem value="LOW">LOW</SelectItem>
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setPriorityFilter('');
            }}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Due Date</TableHead>
                <TableHead className="text-xs font-semibold">Lead</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Assigned To</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Last Call Summary</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : followUps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="text-center py-12">
                      <CalendarClock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">No follow-ups found</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {activeFilterCount > 0
                          ? 'Try adjusting your filters.'
                          : 'Click "Create Follow-Up" to schedule one.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                followUps.map((fu) => {
                  const overdue = isOverdue(fu.dueDatetime, fu.status);
                  return (
                    <TableRow
                      key={fu.id}
                      className={`${overdue ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''} ${
                        fu.status === 'COMPLETED' ? 'opacity-60' : ''
                      } transition-colors`}
                    >
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                          <span className={overdue ? 'text-red-600 font-medium' : ''}>
                            {formatDate(fu.dueDatetime)}
                          </span>
                        </div>
                        {overdue && (
                          <span className="text-[10px] text-red-500 font-medium mt-0.5 block">
                            OVERDUE
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {fu.lead ? `${fu.lead.firstName} ${fu.lead.lastName}` : '—'}
                          </p>
                          {fu.reason && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[150px] truncate">
                              {fu.reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${priorityBadgeColors[fu.priority] ?? ''}`}
                        >
                          {fu.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusBadgeColors[fu.status] ?? ''}`}
                        >
                          {fu.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {fu.assignedTo?.name ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span
                          className="text-xs text-muted-foreground block max-w-[200px] truncate"
                          title={fu.lastCallSummary ?? ''}
                        >
                          {fu.lastCallSummary
                            ? fu.lastCallSummary.length > 50
                              ? `${fu.lastCallSummary.slice(0, 50)}...`
                              : fu.lastCallSummary
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            {/* View Lead */}
                            {fu.lead && onNavigateToLead && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => onNavigateToLead(fu.leadId)}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Lead</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Complete */}
                            {(fu.status === 'PENDING' || fu.status === 'MISSED') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => openCompleteDialog(fu)}
                                    disabled={actionLoading}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark Complete</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Missed */}
                            {fu.status === 'PENDING' && overdue && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600 hover:bg-red-50"
                                    onClick={() => handleMarkMissed(fu)}
                                    disabled={actionLoading}
                                  >
                                    <AlarmClock className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark Missed</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Snooze */}
                            {fu.status === 'PENDING' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-amber-600 hover:bg-amber-50"
                                    onClick={() => openSnoozeDialog(fu)}
                                    disabled={actionLoading}
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Snooze (Reschedule)</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Escalate */}
                            {(fu.status === 'PENDING' || fu.status === 'MISSED') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-purple-600 hover:bg-purple-50"
                                    onClick={() => openEscalateDialog(fu)}
                                    disabled={actionLoading}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Escalate</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
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
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
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
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
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

      {/* Create Follow-Up Dialog */}
      <CreateFollowupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={user.id}
        userRole={user.role}
        onSuccess={fetchFollowUps}
      />

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Follow-Up</DialogTitle>
            <DialogDescription>
              Mark this follow-up as completed for{' '}
              {selectedFollowUp?.lead
                ? `${selectedFollowUp.lead.firstName} ${selectedFollowUp.lead.lastName}`
                : 'this lead'}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Completion Notes</Label>
              <Textarea
                placeholder="What was the outcome of this follow-up?"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={snoozeOpen} onOpenChange={setSnoozeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Snooze Follow-Up</DialogTitle>
            <DialogDescription>
              Reschedule this follow-up for later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">New Date</Label>
              <Input
                type="date"
                value={snoozeDate}
                onChange={(e) => setSnoozeDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">New Time</Label>
              <Input
                type="time"
                value={snoozeTime}
                onChange={(e) => setSnoozeTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSnooze}
              disabled={actionLoading || !snoozeDate || !snoozeTime}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Reschedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escalate Follow-Up</DialogTitle>
            <DialogDescription>
              Escalate this follow-up to another team member or admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Escalate To</Label>
              <Select value={escalateToId} onValueChange={setEscalateToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers
                    .filter((m) => m.id !== user.id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  {teamMembers.filter((m) => m.id !== user.id).length === 0 && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      No team members available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (optional)</Label>
              <Textarea
                placeholder="Why is this being escalated?"
                value={escalateNotes}
                onChange={(e) => setEscalateNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleEscalate}
              disabled={actionLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Escalating...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Escalate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
