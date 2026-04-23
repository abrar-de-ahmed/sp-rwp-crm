'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Pencil,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  CreditCard,
  Tag,
  Building,
  Users,
  Mail,
  Smartphone,
  Globe,
  Target,
  Send,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
import CreateLeadDialog from '@/components/create-lead-dialog';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface LeadUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CallRecord {
  id: string;
  direction: string;
  callTimestamp: string;
  durationSeconds: number;
  outcome: string;
  aiSummary: string | null;
  rep: { id: string; name: string } | null;
}

interface ConversationRecord {
  id: string;
  channel: string;
  direction: string;
  messageText: string;
  sentBy: string;
  timestamp: string;
  sender: { id: string; name: string } | null;
}

interface FollowUpRecord {
  id: string;
  dueDatetime: string;
  priority: string;
  status: string;
  reason: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  assignedTo: { id: string; name: string } | null;
}

interface MembershipRecord {
  id: string;
  planType: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: string;
  familyMembersCount: number;
  amountPaid: number;
  rep: { id: string; name: string } | null;
}

interface FullLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  whatsappNumber: string | null;
  source: string;
  leadType: string;
  interestedFacilities: string;
  leadScore: number;
  temperature: string;
  status: string;
  assignedRepId: string | null;
  assignedRep: { id: string; name: string; email: string } | null;
  familySize: number | null;
  budgetRange: string | null;
  lostReason: string | null;
  metaAdCampaign: string | null;
  remarks: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
  calls: CallRecord[];
  conversations: ConversationRecord[];
  followUps: FollowUpRecord[];
  memberships: MembershipRecord[];
  auditLogs: Array<Record<string, unknown>>;
}

interface LeadDetailProps {
  leadId: string;
  user: LeadUser;
  onBack: () => void;
  onLeadUpdated?: () => void;
}

// ──────────────────────────────────────
// Badge Helpers
// ──────────────────────────────────────

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

const leadTypeLabels: Record<string, string> = {
  MEMBERSHIP: 'Membership',
  DAY_PASS: 'Day Pass',
  CORPORATE: 'Corporate',
  EVENT: 'Event',
  CORPORATE_EVENT: 'Corporate Event',
  TOURNAMENT: 'Tournament',
  CAMP: 'Camp',
  OTHER: 'Other',
};

const budgetLabels: Record<string, string> = {
  UNDER_10K: 'Under 10K PKR',
  '10K_15K': '10K - 15K PKR',
  '15K_25K': '15K - 25K PKR',
  '25K_50K': '25K - 50K PKR',
  '50K_PLUS': '50K+ PKR',
  NOT_DISCLOSED: 'Not Disclosed',
};

const channelBadgeColors: Record<string, string> = {
  WHATSAPP: 'bg-emerald-100 text-emerald-700',
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  FACEBOOK: 'bg-blue-100 text-blue-700',
  SMS: 'bg-slate-100 text-slate-700',
};

const priorityBadgeColors: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  NORMAL: 'bg-sky-100 text-sky-700 border-sky-200',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

const followUpStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  MISSED: 'bg-red-100 text-red-700 border-red-200',
  ESCALATED: 'bg-purple-100 text-purple-700 border-purple-200',
};

const membershipStatusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPIRING: 'bg-amber-100 text-amber-700 border-amber-200',
  EXPIRED: 'bg-red-100 text-red-700 border-red-200',
  RENEWED: 'bg-blue-100 text-blue-700 border-blue-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const QUICK_STATUSES = [
  { value: 'CONTACTED', label: 'Contacted', color: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  { value: 'INTERESTED', label: 'Interested', color: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { value: 'BOOKED', label: 'Booked', color: 'border-green-300 text-green-700 hover:bg-green-50' },
  { value: 'LOST', label: 'Lost', color: 'border-red-300 text-red-700 hover:bg-red-50' },
];

const LOST_REASONS = [
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number' },
  { value: 'UNREACHABLE', label: 'Unreachable' },
  { value: 'WENT_COMPETITOR', label: 'Went to Competitor' },
  { value: 'BUDGET', label: 'Budget Issues' },
  { value: 'OTHER', label: 'Other' },
];

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function LeadDetail({ leadId, user, onBack, onLeadUpdated }: LeadDetailProps) {
  const { toast } = useToast();
  const [lead, setLead] = useState<FullLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [remarkText, setRemarkText] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [lostReasonSelect, setLostReasonSelect] = useState('');
  const [showLostReason, setShowLostReason] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch lead', variant: 'destructive' });
        onBack();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch lead', variant: 'destructive' });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [leadId, toast, onBack]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return;
    setAddingRemark(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark: remarkText.trim() }),
      });
      if (res.ok) {
        toast({ title: 'Remark Added', description: 'Your remark has been saved.' });
        setRemarkText('');
        fetchLead();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to add remark', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add remark', variant: 'destructive' });
    } finally {
      setAddingRemark(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'LOST') {
      setShowLostReason(true);
      return;
    }

    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ title: 'Status Updated', description: `Lead status changed to ${newStatus}` });
        fetchLead();
        onLeadUpdated?.();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to update status', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleLostConfirm = async () => {
    if (!lostReasonSelect) {
      toast({ title: 'Error', description: 'Please select a lost reason', variant: 'destructive' });
      return;
    }
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LOST', lostReason: lostReasonSelect }),
      });
      if (res.ok) {
        toast({ title: 'Status Updated', description: 'Lead marked as LOST' });
        setShowLostReason(false);
        setLostReasonSelect('');
        fetchLead();
        onLeadUpdated?.();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to update status', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const facilities: string[] = JSON.parse(lead.interestedFacilities || '[]');
  const tags: string[] = JSON.parse(lead.tags || '[]');

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Leads
      </Button>

      {/* Lead Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-lg font-bold flex-shrink-0">
                {lead.firstName[0]}{lead.lastName[0]}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">
                    {lead.firstName} {lead.lastName}
                  </h2>
                  <Badge variant="outline" className="text-xs font-mono bg-emerald-100 text-emerald-700 border-emerald-200">
                    Score: {lead.leadScore}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {lead.phone}
                  </span>
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {lead.email}
                    </span>
                  )}
                  {lead.whatsappNumber && (
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      {lead.whatsappNumber}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs ${temperatureBadgeColors[lead.temperature] ?? ''}`}
                  >
                    {lead.temperature}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusBadgeColors[lead.status] ?? ''}`}
                  >
                    {lead.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${sourceBadgeColors[lead.source] ?? ''}`}
                  >
                    {sourceLabels[lead.source] ?? lead.source}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                    {leadTypeLabels[lead.leadType] ?? lead.leadType}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  {lead.assignedRep?.name ?? 'Unassigned'}
                  {lead.assignedRep && <span>&middot; {lead.assignedRep.email}</span>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open(`tel:${lead.phone}`, '_self')}
                    >
                      <Phone className="w-4 h-4" />
                      <span className="hidden sm:inline">Call</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Call Lead</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        if (lead.whatsappNumber) {
                          window.open(`https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, '')}`, '_blank');
                        } else {
                          window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`, '_blank');
                        }
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Message</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send WhatsApp Message</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Lead</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Lead Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              Lead Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interested Facilities */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Interested Facilities
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {facilities.length > 0 ? facilities.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-sm">
                    <div className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm">{f}</span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No facilities specified</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Family Size</span>
                <span className="font-medium">{lead.familySize ?? 'Not specified'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Budget Range</span>
                <span className="font-medium">{budgetLabels[lead.budgetRange ?? ''] ?? 'Not specified'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Source</span>
                <span className="font-medium">{sourceLabels[lead.source] ?? lead.source}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Lead Type</span>
                <span className="font-medium">{leadTypeLabels[lead.leadType] ?? lead.leadType}</span>
              </div>
              {lead.metaAdCampaign && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground block">Meta Ad Campaign</span>
                  <span className="font-medium">{lead.metaAdCampaign}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Created */}
            <Separator />
            <div className="text-xs text-muted-foreground">
              Created: {formatDateTime(lead.createdAt)} &middot; Last updated: {formatDateTime(lead.updatedAt)}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Conversation Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Conversation Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.conversations.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {lead.conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg border ${
                      conv.direction === 'INBOUND'
                        ? 'bg-emerald-50/50 border-emerald-100'
                        : 'bg-blue-50/50 border-blue-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="outline"
                        className={`text-xs ${channelBadgeColors[conv.channel] ?? 'bg-gray-100'}`}
                      >
                        {conv.channel}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {conv.direction}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          conv.sentBy === 'CUSTOMER'
                            ? 'bg-purple-50 text-purple-700'
                            : conv.sentBy === 'AI_AGENT'
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {conv.sentBy === 'CUSTOMER'
                          ? 'Customer'
                          : conv.sentBy === 'AI_AGENT'
                            ? `AI Agent`
                            : conv.sender?.name ?? 'Rep'}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(conv.timestamp).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {conv.messageText}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lead.calls.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Direction</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Outcome</TableHead>
                    <TableHead className="text-xs">Rep</TableHead>
                    <TableHead className="text-xs w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lead.calls.map((call) => (
                    <>
                      <TableRow key={call.id}>
                        <TableCell className="text-xs">
                          {formatDateTime(call.callTimestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              call.direction === 'INBOUND'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {call.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatDuration(call.durationSeconds)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              call.outcome === 'ANSWERED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {call.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{call.rep?.name ?? '—'}</TableCell>
                        <TableCell>
                          {call.aiSummary && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                setExpandedCall(expandedCall === call.id ? null : call.id)
                              }
                            >
                              {expandedCall === call.id ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedCall === call.id && call.aiSummary && (
                        <TableRow key={`${call.id}-summary`}>
                          <TableCell colSpan={6} className="bg-muted/50 px-4 py-3">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">AI Summary</p>
                              <p className="text-sm">{call.aiSummary}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No call history yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-Ups */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Follow-Ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lead.followUps.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Assigned To</TableHead>
                    <TableHead className="text-xs">Reason / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lead.followUps.map((fu) => (
                    <TableRow key={fu.id}>
                      <TableCell className="text-xs">
                        {formatDateTime(fu.dueDatetime)}
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
                          className={`text-xs ${followUpStatusColors[fu.status] ?? ''}`}
                        >
                          {fu.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {fu.assignedTo?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {fu.reason || fu.completionNotes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No follow-ups yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Membership Info */}
      {lead.memberships.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Membership Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lead.memberships.map((membership) => (
                <div key={membership.id} className="p-4 rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="font-medium">{membership.planName}</p>
                      <p className="text-xs text-muted-foreground">{membership.planType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${membershipStatusColors[membership.status] ?? ''}`}
                      >
                        {membership.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">
                        PKR {membership.amountPaid.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Start Date</span>
                      <span className="font-medium">{formatDateTime(membership.startDate)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">End Date</span>
                      <span className="font-medium">{formatDateTime(membership.endDate)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Family Members</span>
                      <span className="font-medium">{membership.familyMembersCount}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Sales Rep</span>
                      <span className="font-medium">{membership.rep?.name ?? '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remarks Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            Remarks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing remarks */}
          {lead.remarks ? (
            <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap break-words">
              {lead.remarks}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No remarks yet.</p>
          )}

          {/* Add new remark */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a new remark..."
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={handleAddRemark}
              disabled={addingRemark || !remarkText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 self-end"
            >
              {addingRemark ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Status Update */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            Update Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusUpdating ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Updating status...</span>
            </div>
          ) : showLostReason ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Please select a reason for marking this lead as LOST:</p>
              <Select value={lostReasonSelect} onValueChange={setLostReasonSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  onClick={handleLostConfirm}
                  disabled={!lostReasonSelect}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm LOST
                </Button>
                <Button variant="outline" onClick={() => setShowLostReason(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {QUICK_STATUSES.map((s) => (
                <Button
                  key={s.value}
                  variant="outline"
                  size="sm"
                  className={s.color}
                  disabled={lead.status === s.value}
                  onClick={() => handleStatusChange(s.value)}
                >
                  {lead.status === s.value && '✓ '}
                  {s.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Lead Dialog */}
      {lead && (
        <CreateLeadDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editLead={{
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
            email: lead.email ?? '',
            whatsappNumber: lead.whatsappNumber ?? '',
            source: lead.source,
            leadType: lead.leadType,
            interestedFacilities: JSON.parse(lead.interestedFacilities || '[]'),
            familySize: lead.familySize,
            budgetRange: lead.budgetRange ?? '',
            tags: JSON.parse(lead.tags || '[]'),
            assignedRepId: lead.assignedRepId ?? '',
            metaAdCampaign: lead.metaAdCampaign ?? '',
            remarks: '',
          }}
          userId={user.id}
          userRole={user.role}
          onSuccess={() => {
            fetchLead();
            onLeadUpdated?.();
          }}
        />
      )}
    </div>
  );
}
