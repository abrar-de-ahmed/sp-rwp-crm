'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Filter,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  BarChart3,
  MessageSquare,
  PhoneCall,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserProps {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AIInsight {
  id: string;
  agentId: number;
  insightType: string;
  description: string;
  dataPoints: number;
  confidenceScore: number;
  proposedChange: string | null;
  expectedImpact: string | null;
  status: string;
  reviewedById: string | null;
  reviewedBy: { name: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const AGENT_NAMES: Record<number, string> = {
  1: 'Lead Scoring Engine',
  2: 'Customer Bot',
  3: 'Call Monitor',
  4: 'Follow-Up Agent',
  5: 'Reporting Agent',
};

const AGENT_ICONS: Record<number, React.ReactNode> = {
  1: <Target className="w-4 h-4" />,
  2: <MessageSquare className="w-4 h-4" />,
  3: <PhoneCall className="w-4 h-4" />,
  4: <Clock className="w-4 h-4" />,
  5: <BarChart3 className="w-4 h-4" />,
};

const STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  PENDING_REVIEW: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3 h-3" />,
    label: 'Pending Review',
  },
  APPROVED: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: 'Approved',
  },
  REJECTED: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="w-3 h-3" />,
    label: 'Rejected',
  },
  DEPLOYED: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: <Sparkles className="w-3 h-3" />,
    label: 'Deployed',
  },
};

const TYPE_STYLES: Record<string, { badge: string; label: string }> = {
  PATTERN: { badge: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Pattern' },
  SUGGESTION: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Suggestion' },
  COACHING: { badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Coaching' },
  IMPROVEMENT: { badge: 'bg-sky-50 text-sky-700 border-sky-200', label: 'Improvement' },
};

export default function AIInsightsPage({ user }: { user: UserProps }) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filters
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Review dialogs
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Expanded insight
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterAgent !== 'all') params.set('agentId', filterAgent);
      if (filterType !== 'all') params.set('type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`/api/ai/insights?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights);
        setTotalPages(data.totalPages);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load AI insights',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, filterAgent, filterType, filterStatus]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleReview = async (action: 'APPROVE' | 'REJECT' | 'DEPLOY') => {
    if (!selectedInsight) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId: selectedInsight.id,
          action,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        const labels = { APPROVE: 'Approved', REJECT: 'Rejected', DEPLOY: 'Deployed' };
        toast({
          title: `Insight ${labels[action]}`,
          description: `${selectedInsight.description.substring(0, 60)}...`,
        });
        setReviewDialogOpen(false);
        setRejectDialogOpen(false);
        setReviewNotes('');
        setSelectedInsight(null);
        fetchInsights();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update insight.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const openRejectDialog = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setReviewNotes('');
    setRejectDialogOpen(true);
  };

  // Stats
  const stats = {
    total: insights.length,
    pending: insights.filter((i) => i.status === 'PENDING_REVIEW').length,
    approved: insights.filter((i) => i.status === 'APPROVED').length,
    deployed: insights.filter((i) => i.status === 'DEPLOYED').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-7 h-7 text-emerald-600" />
            AI Insights
          </h2>
          <p className="text-muted-foreground mt-1">
            Review AI-generated insights and approve changes to improve agent performance.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2 bg-emerald-50">
                <Brain className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2 bg-amber-50">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2 bg-emerald-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2 bg-sky-50">
                <Sparkles className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.deployed}</p>
                <p className="text-xs text-muted-foreground">Deployed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={filterAgent} onValueChange={(v) => { setFilterAgent(v); setPage(1); }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {[1, 2, 3, 4, 5].map((id) => (
                  <SelectItem key={id} value={String(id)}>
                    {AGENT_NAMES[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PATTERN">Pattern</SelectItem>
                <SelectItem value="SUGGESTION">Suggestion</SelectItem>
                <SelectItem value="COACHING">Coaching</SelectItem>
                <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="DEPLOYED">Deployed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No insights found matching your filters.</p>
            <Button variant="link" className="text-emerald-600 mt-2" onClick={() => { setFilterAgent('all'); setFilterType('all'); setFilterStatus('all'); }}>
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => {
            const statusStyle = STATUS_STYLES[insight.status] ?? STATUS_STYLES.PENDING_REVIEW;
            const typeStyle = TYPE_STYLES[insight.insightType] ?? TYPE_STYLES.SUGGESTION;
            const isExpanded = expandedId === insight.id;

            return (
              <Card key={insight.id} className={`transition-all duration-200 ${insight.status === 'PENDING_REVIEW' ? 'border-l-4 border-l-amber-400' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Agent icon */}
                      <div className="rounded-lg p-1.5 bg-muted/50 shrink-0 mt-0.5">
                        {AGENT_ICONS[insight.agentId] ?? <Brain className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-muted-foreground">
                            {AGENT_NAMES[insight.agentId] ?? `Agent ${insight.agentId}`}
                          </span>
                          <Badge variant="outline" className={`text-xs ${typeStyle.badge}`}>
                            {typeStyle.label}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${statusStyle.badge}`}>
                            {statusStyle.icon}
                            {statusStyle.label}
                          </Badge>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-foreground leading-relaxed">
                          {insight.description}
                        </p>

                        {/* Meta info */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {insight.dataPoints} data points
                          </span>
                          <span className="flex items-center gap-1">
                            Confidence: {Math.round(insight.confidenceScore * 100)}%
                          </span>
                          <span>
                            {new Date(insight.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                            })}
                          </span>
                          {insight.reviewedBy && (
                            <span>
                              Reviewed by {insight.reviewedBy.name}
                            </span>
                          )}
                        </div>

                        {/* Expand button for details */}
                        {(insight.proposedChange || insight.expectedImpact || insight.reviewNotes) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs h-7"
                            onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                          >
                            {isExpanded ? (
                              <><ChevronUp className="w-3 h-3 mr-1" />Less</>
                            ) : (
                              <><ChevronDown className="w-3 h-3 mr-1" />Details</>
                            )}
                          </Button>
                        )}

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 space-y-2 p-3 bg-muted/30 rounded-lg">
                            {insight.proposedChange && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Proposed Change</p>
                                <p className="text-sm">{insight.proposedChange}</p>
                              </div>
                            )}
                            {insight.expectedImpact && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Expected Impact</p>
                                <p className="text-sm">{insight.expectedImpact}</p>
                              </div>
                            )}
                            {insight.reviewNotes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Review Notes</p>
                                <p className="text-sm">{insight.reviewNotes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {insight.status === 'PENDING_REVIEW' && isSuperAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => openReviewDialog(insight)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => openRejectDialog(insight)}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Approve Insight
            </DialogTitle>
            <DialogDescription>
              This insight will be marked as approved. You can also add optional notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{selectedInsight?.description}</p>
              {selectedInsight?.proposedChange && (
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Proposed:</strong> {selectedInsight.proposedChange}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="approve-notes">Review Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="Any notes for this approval..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleReview('APPROVE')}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Insight
            </DialogTitle>
            <DialogDescription>
              This insight will be marked as rejected. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{selectedInsight?.description}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reject-notes">Rejection Reason</Label>
              <Textarea
                id="reject-notes"
                placeholder="Why are you rejecting this insight?"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleReview('REJECT')}
              disabled={submitting || !reviewNotes.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
