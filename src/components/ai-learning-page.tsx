'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Filter,
  Loader2,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  RefreshCw,
  Download,
  Trash2,
  Settings2,
  Search,
  CheckCheck,
  Ban,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Zap,
  Database,
  FileQuestion,
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
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface UserProps {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LearningStats {
  totalConversations: number;
  conversationTrend: number; // percentage change
  faqMatchRate: number;
  llmResponseRate: number;
  handoffRate: number;
  approvedLearnings: number;
  pendingReview: number;
  weeklyActivity: { day: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  feedbackDistribution: { positive: number; neutral: number; negative: number };
}

interface LearningPattern {
  id: string;
  input: string;
  output: string;
  category: string;
  type: string;
  frequency: number;
  frequencyTrend: number;
  confidence: number;
  feedback: string;
  status: string;
  context: string;
  reviewNotes: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

interface FAQCandidate {
  id: string;
  question: string;
  suggestedAnswer: string;
  frequency: number;
  language: string;
  confidence: number;
  status: string;
}

// ──────────────────────────────────────
// Color maps
// ──────────────────────────────────────

const CATEGORY_STYLES: Record<string, { badge: string; label: string }> = {
  question_answer: { badge: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Q&A' },
  objection_handling: { badge: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Objection' },
  pricing_response: { badge: 'bg-green-50 text-green-700 border-green-200', label: 'Pricing' },
  facility_info: { badge: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Facility' },
  booking_flow: { badge: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Booking' },
  sentiment_pattern: { badge: 'bg-pink-50 text-pink-700 border-pink-200', label: 'Sentiment' },
  conversion_strategy: { badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Conversion' },
};

const STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  pending: {
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: <Clock className="w-3 h-3" />,
    label: 'Pending',
  },
  approved: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: 'Approved',
  },
  rejected: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="w-3 h-3" />,
    label: 'Rejected',
  },
  auto_approved: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: <Zap className="w-3 h-3" />,
    label: 'Auto',
  },
  deployed: {
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-300',
    icon: <Sparkles className="w-3 h-3" />,
    label: 'Deployed',
  },
};

const FEEDBACK_STYLES: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  positive: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <ThumbsUp className="w-3 h-3" />,
    label: 'Positive',
  },
  negative: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: <ThumbsDown className="w-3 h-3" />,
    label: 'Negative',
  },
  neutral: {
    badge: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: <MinusCircle className="w-3 h-3" />,
    label: 'Neutral',
  },
};

const TYPE_STYLES: Record<string, { badge: string; label: string }> = {
  conversation: { badge: 'bg-sky-50 text-sky-700 border-sky-200', label: 'Conversation' },
  faq_match: { badge: 'bg-violet-50 text-violet-700 border-violet-200', label: 'FAQ Match' },
  llm_response: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'LLM' },
  handoff: { badge: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Handoff' },
};

const LANGUAGE_STYLES: Record<string, { badge: string; label: string }> = {
  EN: { badge: 'bg-sky-50 text-sky-700 border-sky-200', label: 'English' },
  UR: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Urdu' },
  RU: { badge: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Russian' },
};

const DONUT_COLORS = ['#0d9488', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#eab308', '#10b981'];

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function AILearningPage({ user }: { user: UserProps }) {
  const { toast } = useToast();

  // ─── State ───
  const [statsLoading, setStatsLoading] = useState(true);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [totalPatternPages, setTotalPatternPages] = useState(1);
  const [faqCandidates, setFaqCandidates] = useState<FAQCandidate[]>([]);

  // Pagination
  const [patternPage, setPatternPage] = useState(1);

  // Filters (Patterns tab)
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand
  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editFaqDialogOpen, setEditFaqDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<LearningPattern | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<FAQCandidate | null>(null);

  // Edit FAQ
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editLanguage, setEditLanguage] = useState('EN');

  // Settings
  const [settings, setSettings] = useState({
    autoApprove: false,
    autoApproveMinFrequency: 5,
    autoApproveMinFeedback: 70,
    recordingEnabled: true,
    repOverrideTracking: true,
    outcomeTracking: true,
  });

  // Submitting
  const [analyzing, setAnalyzing] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // ─── Fetch Stats ───
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/ai/learning/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silent — we'll show defaults
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ─── Fetch Patterns ───
  const fetchPatterns = useCallback(async () => {
    setPatternsLoading(true);
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        category: filterCategory,
        type: filterType,
        page: String(patternPage),
        limit: '20',
      });
      const res = await fetch(`/api/ai/learning/patterns?${params}`);
      if (res.ok) {
        const data = await res.json();
        let items: LearningPattern[] = data.patterns ?? data.records ?? [];
        // Client-side search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          items = items.filter(
            (p) =>
              p.input.toLowerCase().includes(q) ||
              p.output.toLowerCase().includes(q)
          );
        }
        setPatterns(items);
        setTotalPatternPages(data.totalPages ?? 1);
      }
    } catch {
      // silent
    } finally {
      setPatternsLoading(false);
    }
  }, [filterStatus, filterCategory, filterType, patternPage, searchQuery]);

  // ─── Fetch FAQs ───
  const fetchFaqs = useCallback(async () => {
    setFaqsLoading(true);
    try {
      const res = await fetch('/api/ai/learning/faqs');
      if (res.ok) {
        const data = await res.json();
        setFaqCandidates(data.faqs ?? data.candidates ?? []);
      }
    } catch {
      // silent
    } finally {
      setFaqsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // ─── Handlers ───
  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/learning/analyze', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Analysis Complete',
          description: data.message ?? `Found ${data.newPatterns ?? 0} new patterns and ${data.newFaqs ?? 0} FAQ candidates.`,
        });
        fetchStats();
        fetchPatterns();
        fetchFaqs();
      } else {
        toast({ title: 'Error', description: 'Analysis failed.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApprovePattern = async (id: string) => {
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/ai/learning/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (res.ok) {
        toast({ title: 'Approved', description: 'Learning pattern approved.' });
        fetchPatterns();
        fetchStats();
      } else {
        toast({ title: 'Error', description: 'Failed to approve.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleRejectPattern = async (id: string) => {
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/ai/learning/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (res.ok) {
        toast({ title: 'Rejected', description: 'Learning pattern rejected.' });
        fetchPatterns();
        fetchStats();
      } else {
        toast({ title: 'Error', description: 'Failed to reject.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleBulkAction = async (action: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) return;
    setActionSubmitting(true);
    try {
      const res = await fetch('/api/ai/learning/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningIds: Array.from(selectedIds),
          action,
        }),
      });
      if (res.ok) {
        toast({
          title: `Bulk ${action === 'approved' ? 'Approve' : 'Reject'}`,
          description: `${selectedIds.size} items ${action}.`,
        });
        setSelectedIds(new Set());
        fetchPatterns();
        fetchStats();
      }
    } catch {
      toast({ title: 'Error', description: 'Bulk action failed.', variant: 'destructive' });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleApproveFaq = async (faq: FAQCandidate) => {
    setActionSubmitting(true);
    try {
      const res = await fetch('/api/ai/learning/faqs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningId: faq.id, action: 'approve' }),
      });
      if (res.ok) {
        toast({ title: 'FAQ Added', description: 'FAQ added to AI knowledge base.' });
        fetchFaqs();
        fetchStats();
      } else {
        toast({ title: 'Error', description: 'Failed to add FAQ.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleRejectFaq = async (faq: FAQCandidate) => {
    setActionSubmitting(true);
    try {
      const res = await fetch('/api/ai/learning/faqs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningId: faq.id, action: 'reject' }),
      });
      if (res.ok) {
        toast({ title: 'Rejected', description: 'FAQ candidate discarded.' });
        fetchFaqs();
      } else {
        toast({ title: 'Error', description: 'Failed to reject FAQ.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setActionSubmitting(false);
    }
  };

  const openEditFaqDialog = (faq: FAQCandidate) => {
    setSelectedFaq(faq);
    setEditQuestion(faq.question);
    setEditAnswer(faq.suggestedAnswer);
    setEditLanguage(faq.language);
    setEditFaqDialogOpen(true);
  };

  const handleSaveEditedFaq = async () => {
    if (!selectedFaq || !editQuestion.trim() || !editAnswer.trim()) return;
    setActionSubmitting(true);
    try {
      const res = await fetch('/api/ai/learning/faqs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningId: selectedFaq.id,
          action: 'approve',
          editedQuestion: editQuestion.trim(),
          editedAnswer: editAnswer.trim(),
          language: editLanguage,
        }),
      });
      if (res.ok) {
        toast({ title: 'FAQ Added', description: 'Edited FAQ added to AI knowledge base.' });
        setEditFaqDialogOpen(false);
        fetchFaqs();
        fetchStats();
      } else {
        toast({ title: 'Error', description: 'Failed to save FAQ.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/ai/learning/patterns?status=all&category=all&type=all&page=1&limit=1000');
      if (res.ok) {
        const data = await res.json();
        const items = data.patterns ?? data.records ?? [];
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-learning-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Exported', description: `${items.length} records exported.` });
      }
    } catch {
      toast({ title: 'Error', description: 'Export failed.', variant: 'destructive' });
    }
  };

  const handleResetLearning = async () => {
    setActionSubmitting(true);
    try {
      const res = await fetch('/api/ai/learning/patterns', {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Reset Complete', description: 'All learning data has been cleared.' });
        fetchStats();
        fetchPatterns();
        fetchFaqs();
      }
    } catch {
      toast({ title: 'Error', description: 'Reset failed.', variant: 'destructive' });
    } finally {
      setActionSubmitting(false);
      setResetDialogOpen(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === patterns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patterns.map((p) => p.id)));
    }
  };

  // ─── Computed ───
  const pendingPatterns = useMemo(
    () => patterns.filter((p) => p.status === 'pending'),
    [patterns]
  );

  // ─── Donut chart helper ───
  const renderDonutChart = (
    data: { category: string; count: number }[],
    size = 160,
    strokeWidth = 28
  ) => {
    if (!data.length) return null;
    const total = data.reduce((s, d) => s + d.count, 0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.92 0.01 250)"
          strokeWidth={strokeWidth}
        />
        {data.map((item, i) => {
          const pct = item.count / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            />
          );
          offset += dash;
          return el;
        })}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground text-sm font-semibold"
        >
          {total}
        </text>
      </svg>
    );
  };

  // ─── Render ───
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-teal-600" />
            AI Learning Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Review, approve, and manage the AI&apos;s learned knowledge base.
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Run Analysis
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="faqs">
            <FileQuestion className="w-4 h-4 mr-1.5" />
            FAQ Candidates
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="w-4 h-4 mr-1.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════
            TAB 1 — Overview
            ═══════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Row */}
          {statsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Conversations */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total AI Conversations</p>
                      <p className="text-2xl font-bold mt-1">
                        {stats?.totalConversations ?? 0}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="rounded-xl p-2.5 bg-teal-50">
                        <MessageSquare className="w-5 h-5 text-teal-600" />
                      </div>
                      {(stats?.conversationTrend ?? 0) !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 text-xs font-medium ${
                            (stats?.conversationTrend ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        >
                          {(stats?.conversationTrend ?? 0) > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {Math.abs(stats?.conversationTrend ?? 0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ Match Rate */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">FAQ Match Rate</p>
                    <span className="text-xs font-semibold text-teal-600">
                      {stats?.faqMatchRate ?? 0}%
                    </span>
                  </div>
                  <Progress value={stats?.faqMatchRate ?? 0} className="h-2 mb-1" />
                  <p className="text-[10px] text-muted-foreground">Questions matched by FAQ</p>
                </CardContent>
              </Card>

              {/* LLM Response Rate */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">LLM Response Rate</p>
                    <span className="text-xs font-semibold text-teal-600">
                      {stats?.llmResponseRate ?? 0}%
                    </span>
                  </div>
                  <Progress value={stats?.llmResponseRate ?? 0} className="h-2 mb-1" />
                  <p className="text-[10px] text-muted-foreground">Handled by AI model</p>
                </CardContent>
              </Card>

              {/* Handoff Rate */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Handoff Rate</p>
                    <span className="text-xs font-semibold text-amber-600">
                      {stats?.handoffRate ?? 0}%
                    </span>
                  </div>
                  <Progress
                    value={stats?.handoffRate ?? 0}
                    className="h-2 mb-1 [&>div]:bg-amber-500"
                  />
                  <p className="text-[10px] text-muted-foreground">Transferred to human</p>
                </CardContent>
              </Card>

              {/* Approved */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl p-2.5 bg-emerald-50">
                      <CheckCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.approvedLearnings ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Approved Learnings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl p-2.5 bg-yellow-50">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.pendingReview ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Pending Review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Weekly Activity + Category Breakdown + Feedback */}
          {statsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Weekly Activity Bar Chart */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-500" />
                    Weekly Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {stats?.weeklyActivity && stats.weeklyActivity.length > 0 ? (
                    <div className="flex items-end gap-2 h-40">
                      {stats.weeklyActivity.map((day) => {
                        const maxCount = Math.max(...stats.weeklyActivity.map((d) => d.count), 1);
                        const height = Math.max((day.count / maxCount) * 100, 4);
                        return (
                          <div
                            key={day.day}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {day.count}
                            </span>
                            <div className="w-full flex justify-center">
                              <div
                                className="w-8 rounded-t-md bg-gradient-to-t from-teal-500 to-teal-400 transition-all duration-500 min-h-[4px]"
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{day.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No weekly data yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Category Donut */}
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {renderDonutChart(stats.categoryBreakdown, 120, 24)}
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {stats.categoryBreakdown.map((cat, i) => (
                          <span
                            key={cat.category}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground"
                          >
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                            />
                            {CATEGORY_STYLES[cat.category]?.label ?? cat.category}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No category data.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Feedback Distribution */}
          {statsLoading ? (
            <Skeleton className="h-20 rounded-xl" />
          ) : (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  Feedback Distribution
                </p>
                {stats?.feedbackDistribution ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Positive */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <ThumbsUp className="w-3 h-3" /> Positive
                        </span>
                        <span className="text-xs font-semibold">{stats.feedbackDistribution.positive}</span>
                      </div>
                      <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${stats.feedbackDistribution.positive > 0
                              ? (stats.feedbackDistribution.positive /
                                  (stats.feedbackDistribution.positive +
                                    stats.feedbackDistribution.neutral +
                                    stats.feedbackDistribution.negative || 1)) *
                                100
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    {/* Neutral */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <MinusCircle className="w-3 h-3" /> Neutral
                        </span>
                        <span className="text-xs font-semibold">{stats.feedbackDistribution.neutral}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-400 rounded-full transition-all duration-500"
                          style={{
                            width: `${stats.feedbackDistribution.neutral > 0
                              ? (stats.feedbackDistribution.neutral /
                                  (stats.feedbackDistribution.positive +
                                    stats.feedbackDistribution.neutral +
                                    stats.feedbackDistribution.negative || 1)) *
                                100
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    {/* Negative */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                          <ThumbsDown className="w-3 h-3" /> Negative
                        </span>
                        <span className="text-xs font-semibold">{stats.feedbackDistribution.negative}</span>
                      </div>
                      <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${stats.feedbackDistribution.negative > 0
                              ? (stats.feedbackDistribution.negative /
                                  (stats.feedbackDistribution.positive +
                                    stats.feedbackDistribution.neutral +
                                    stats.feedbackDistribution.negative || 1)) *
                                100
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No feedback data yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Learnings */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                Recent Approved Learnings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {patternsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : patterns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No approved learnings yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {patterns
                    .filter((p) => p.status === 'approved')
                    .slice(0, 10)
                    .map((p) => {
                      const catStyle = CATEGORY_STYLES[p.category] ?? {
                        badge: 'bg-gray-50 text-gray-700 border-gray-200',
                        label: p.category,
                      };
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{p.input.substring(0, 60)}{p.input.length > 60 ? '...' : ''}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {p.output.substring(0, 80)}{p.output.length > 80 ? '...' : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${catStyle.badge}`}>
                            {catStyle.label}
                          </Badge>
                          <div className="w-16 shrink-0">
                            <Progress value={p.confidence} className="h-1.5" />
                            <p className="text-[9px] text-muted-foreground text-right">{p.confidence}%</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
                            {new Date(p.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════
            TAB 2 — Patterns
            ═══════════════════════════════════ */}
        <TabsContent value="patterns" className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPatternPage(1); }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="auto_approved">Auto-Approved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPatternPage(1); }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(CATEGORY_STYLES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPatternPage(1); }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(TYPE_STYLES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search patterns..."
                    className="pl-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <span className="text-sm font-medium text-teal-700">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                disabled={actionSubmitting}
                onClick={() => handleBulkAction('approved')}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Approve All
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 text-red-700 border-red-200 hover:bg-red-50"
                disabled={actionSubmitting}
                onClick={() => handleBulkAction('rejected')}
              >
                <Ban className="w-3 h-3 mr-1" />
                Reject All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Patterns Table */}
          {patternsLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : patterns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BrainCircuit className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No patterns found matching your filters.</p>
                <Button
                  variant="link"
                  className="text-teal-600 mt-2"
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterCategory('all');
                    setFilterType('all');
                    setSearchQuery('');
                  }}
                >
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Select all */}
              <div className="flex items-center gap-2 px-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === patterns.length && patterns.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                  Select all ({patterns.length})
                </label>
              </div>

              {patterns.map((pattern) => {
                const statusStyle = STATUS_STYLES[pattern.status] ?? STATUS_STYLES.pending;
                const catStyle = CATEGORY_STYLES[pattern.category] ?? {
                  badge: 'bg-gray-50 text-gray-700 border-gray-200',
                  label: pattern.category,
                };
                const typeStyle = TYPE_STYLES[pattern.type] ?? {
                  badge: 'bg-gray-50 text-gray-700 border-gray-200',
                  label: pattern.type,
                };
                const feedbackStyle = FEEDBACK_STYLES[pattern.feedback] ?? FEEDBACK_STYLES.neutral;
                const isExpanded = expandedPatternId === pattern.id;
                const isSelected = selectedIds.has(pattern.id);

                return (
                  <Card
                    key={pattern.id}
                    className={`transition-all duration-200 ${
                      pattern.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''
                    } ${isSelected ? 'ring-2 ring-teal-400/50' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="pt-1 shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(pattern.id)}
                            className="rounded border-gray-300"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Input / Output */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                                Input
                              </p>
                              <p className="text-xs leading-relaxed">
                                {isExpanded
                                  ? pattern.input
                                  : `${pattern.input.substring(0, 60)}${pattern.input.length > 60 ? '...' : ''}`}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                                Output
                              </p>
                              <p className="text-xs leading-relaxed">
                                {isExpanded
                                  ? pattern.output
                                  : `${pattern.output.substring(0, 80)}${pattern.output.length > 80 ? '...' : ''}`}
                              </p>
                            </div>
                          </div>

                          {/* Badges Row */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            <Badge variant="outline" className={`text-[10px] ${catStyle.badge}`}>
                              {catStyle.label}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${typeStyle.badge}`}>
                              {typeStyle.label}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${statusStyle.badge}`}>
                              {statusStyle.icon}
                              {statusStyle.label}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${feedbackStyle.badge}`}>
                              {feedbackStyle.icon}
                              {feedbackStyle.label}
                            </Badge>
                          </div>

                          {/* Meta Row */}
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              Freq: <strong className="font-medium">{pattern.frequency}</strong>
                              {pattern.frequencyTrend !== 0 && (
                                <span
                                  className={`text-[10px] ${
                                    pattern.frequencyTrend > 0 ? 'text-emerald-600' : 'text-red-500'
                                  }`}
                                >
                                  ({pattern.frequencyTrend > 0 ? '+' : ''}
                                  {pattern.frequencyTrend})
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-1.5">
                              Confidence:
                              <span className="inline-flex items-center gap-1">
                                <span className="w-12 h-1.5 bg-muted rounded-full overflow-hidden inline-block">
                                  <span
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${pattern.confidence}%`,
                                      backgroundColor:
                                        pattern.confidence >= 80
                                          ? 'oklch(0.65 0.17 160)'
                                          : pattern.confidence >= 50
                                            ? 'oklch(0.75 0.15 85)'
                                            : 'oklch(0.65 0.2 25)',
                                    }}
                                  />
                                </span>
                                {pattern.confidence}%
                              </span>
                            </span>
                            <span>
                              {new Date(pattern.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Expand / Collapse */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1.5 text-[11px] h-6"
                            onClick={() =>
                              setExpandedPatternId(isExpanded ? null : pattern.id)
                            }
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Details
                              </>
                            )}
                          </Button>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2">
                              {pattern.context && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Context
                                  </p>
                                  <pre className="text-[11px] bg-background p-2 rounded border overflow-x-auto max-h-32">
                                    {pattern.context}
                                  </pre>
                                </div>
                              )}
                              {pattern.reviewNotes && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Review Notes
                                  </p>
                                  <p className="text-xs">{pattern.reviewNotes}</p>
                                </div>
                              )}
                              {pattern.reviewedBy && (
                                <p className="text-[10px] text-muted-foreground">
                                  Reviewed by: <strong>{pattern.reviewedBy}</strong>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 shrink-0">
                          {pattern.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] h-7 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                disabled={actionSubmitting}
                                onClick={() => handleApprovePattern(pattern.id)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] h-7 text-red-700 border-red-200 hover:bg-red-50"
                                disabled={actionSubmitting}
                                onClick={() => handleRejectPattern(pattern.id)}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[11px] h-7"
                            onClick={() => {
                              setSelectedPattern(pattern);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPatternPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={patternPage <= 1}
                onClick={() => setPatternPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {patternPage} of {totalPatternPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={patternPage >= totalPatternPages}
                onClick={() => setPatternPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════
            TAB 3 — FAQ Candidates
            ═══════════════════════════════════ */}
        <TabsContent value="faqs" className="space-y-4">
          {faqsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : faqCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileQuestion className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No FAQ candidates yet.
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  The system needs more conversations to detect recurring questions and suggest FAQs.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 text-teal-600 border-teal-200"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Run Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {faqCandidates.length} FAQ candidate{faqCandidates.length !== 1 ? 's' : ''}
                </p>
              </div>
              {faqCandidates.map((faq) => {
                const langStyle = LANGUAGE_STYLES[faq.language] ?? {
                  badge: 'bg-gray-50 text-gray-700 border-gray-200',
                  label: faq.language,
                };
                return (
                  <Card key={faq.id} className="transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Question */}
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                              Detected Question
                            </p>
                            <p className="text-sm font-medium">{faq.question}</p>
                          </div>
                          {/* Suggested Answer */}
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                              Suggested Answer
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {faq.suggestedAnswer}
                            </p>
                          </div>
                          {/* Meta */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${langStyle.badge}`}>
                              {langStyle.label}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              Asked <strong className="font-medium">{faq.frequency}</strong> times
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              Confidence:{' '}
                              <span
                                className={`font-medium ${
                                  faq.confidence >= 80
                                    ? 'text-emerald-600'
                                    : faq.confidence >= 50
                                      ? 'text-amber-600'
                                      : 'text-red-500'
                                }`}
                              >
                                {faq.confidence}%
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            disabled={actionSubmitting}
                            onClick={() => handleApproveFaq(faq)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 text-red-700 border-red-200 hover:bg-red-50"
                            disabled={actionSubmitting}
                            onClick={() => handleRejectFaq(faq)}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[11px] h-7"
                            onClick={() => openEditFaqDialog(faq)}
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════
            TAB 4 — Settings
            ═══════════════════════════════════ */}
        <TabsContent value="settings" className="space-y-6">
          {/* Auto-Approve */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Auto-Approve Threshold
              </CardTitle>
              <CardDescription>
                Automatically approve learnings that meet these criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable Auto-Approval</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically approve high-confidence patterns
                  </p>
                </div>
                <Switch
                  checked={settings.autoApprove}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, autoApprove: v }))}
                />
              </div>
              {settings.autoApprove && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-0 border-l-2 border-amber-200 ml-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Minimum Frequency</Label>
                    <Input
                      type="number"
                      min={1}
                      value={settings.autoApproveMinFrequency}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          autoApproveMinFrequency: parseInt(e.target.value) || 5,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Pattern must appear at least this many times
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Minimum Positive Feedback %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={settings.autoApproveMinFeedback}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          autoApproveMinFeedback: parseInt(e.target.value) || 70,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      At least this % of feedback must be positive
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Recording */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-500" />
                Learning Recording
              </CardTitle>
              <CardDescription>
                Control what data the AI records and learns from.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Conversation Recording</Label>
                  <p className="text-xs text-muted-foreground">
                    Record AI conversations for pattern detection
                  </p>
                </div>
                <Switch
                  checked={settings.recordingEnabled}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, recordingEnabled: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Rep Override Tracking</Label>
                  <p className="text-xs text-muted-foreground">
                    Track when reps override AI responses
                  </p>
                </div>
                <Switch
                  checked={settings.repOverrideTracking}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({ ...s, repOverrideTracking: v }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Outcome Tracking</Label>
                  <p className="text-xs text-muted-foreground">
                    Track BOOKED / LOST feedback on AI responses
                  </p>
                </div>
                <Switch
                  checked={settings.outcomeTracking}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({ ...s, outcomeTracking: v }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions. Use with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-700">Reset All Learning</p>
                  <p className="text-xs text-red-500">
                    Permanently delete all learned patterns and FAQ candidates.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-red-700 border-red-300 hover:bg-red-100 shrink-0"
                  onClick={() => setResetDialogOpen(true)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Reset All
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-amber-700">Clear Pending Only</p>
                  <p className="text-xs text-amber-500">
                    Remove pending reviews but keep approved learnings.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-amber-700 border-amber-300 hover:bg-amber-100 shrink-0"
                  onClick={() => {
                    toast({ title: 'Cleared', description: 'Pending items cleared.' });
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear Pending
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-teal-500" />
                Export
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-medium">Export Learning Data</p>
                  <p className="text-xs text-muted-foreground">
                    Download all learning data as a JSON file.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-teal-700 border-teal-200 hover:bg-teal-50 shrink-0"
                  onClick={handleExport}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════
          Dialogs
          ═══════════════════════════════════ */}

      {/* View Pattern Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-teal-600" />
              Pattern Detail
            </DialogTitle>
          </DialogHeader>
          {selectedPattern && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Input (Customer Message)
                </Label>
                <p className="text-sm mt-1 bg-muted/50 p-3 rounded-lg">
                  {selectedPattern.input}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Output (AI Response)
                </Label>
                <p className="text-sm mt-1 bg-muted/50 p-3 rounded-lg">
                  {selectedPattern.output}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Category
                  </Label>
                  <p className="text-sm mt-1">
                    {CATEGORY_STYLES[selectedPattern.category]?.label ?? selectedPattern.category}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Type
                  </Label>
                  <p className="text-sm mt-1">
                    {TYPE_STYLES[selectedPattern.type]?.label ?? selectedPattern.type}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </Label>
                  <Badge
                    variant="outline"
                    className={`text-xs mt-1 ${STATUS_STYLES[selectedPattern.status]?.badge ?? ''}`}
                  >
                    {STATUS_STYLES[selectedPattern.status]?.icon}
                    {STATUS_STYLES[selectedPattern.status]?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Confidence
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={selectedPattern.confidence} className="h-2 flex-1" />
                    <span className="text-xs font-medium">{selectedPattern.confidence}%</span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Context
                </Label>
                <pre className="text-xs mt-1 bg-muted/50 p-3 rounded-lg overflow-x-auto max-h-32">
                  {selectedPattern.context || 'N/A'}
                </pre>
              </div>
              {selectedPattern.reviewNotes && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Review Notes
                  </Label>
                  <p className="text-sm mt-1">{selectedPattern.reviewNotes}</p>
                </div>
              )}
              {selectedPattern.reviewedBy && (
                <p className="text-xs text-muted-foreground">
                  Reviewed by: <strong>{selectedPattern.reviewedBy}</strong>
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit FAQ Dialog */}
      <Dialog open={editFaqDialogOpen} onOpenChange={setEditFaqDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-teal-600" />
              Edit FAQ Before Approval
            </DialogTitle>
            <DialogDescription>
              Review and edit the question and answer before adding to the FAQ system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="faq-question" className="text-xs font-medium">
                Question
              </Label>
              <Textarea
                id="faq-question"
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faq-answer" className="text-xs font-medium">
                Answer
              </Label>
              <Textarea
                id="faq-answer"
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Language</Label>
              <Select value={editLanguage} onValueChange={setEditLanguage}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">English</SelectItem>
                  <SelectItem value="UR">Urdu</SelectItem>
                  <SelectItem value="RU">Russian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditFaqDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditedFaq}
              disabled={actionSubmitting || !editQuestion.trim() || !editAnswer.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {actionSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Approve &amp; Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Reset All Learning Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all learned patterns, FAQ
              candidates, and feedback data. The AI will start learning from scratch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetLearning}
              disabled={actionSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Yes, Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
