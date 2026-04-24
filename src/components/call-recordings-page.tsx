'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Mic,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Pause,
  FileText,
  Brain,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Save,
  Clock,
  User,
  Volume2,
  Search,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { format, formatDistanceToNow } from 'date-fns';

interface PlaceholderUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CallRecord {
  id: string;
  leadId: string;
  repId: string;
  direction: string;
  callTimestamp: string;
  durationSeconds: number;
  status: string;
  outcome: string;
  recordingUrl: string | null;
  transcriptText: string | null;
  aiSummary: string | null;
  aiExtractedInterest: string | null;
  aiExtractedBudget: string | null;
  aiExtractedObjections: string | null;
  aiExtractedTimeline: string | null;
  aiSentiment: string | null;
  aiCoachingFlag: boolean;
  aiCoachingNote: string | null;
  repRemarks: string | null;
  lead: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  rep: {
    name: string;
  };
  createdAt: string;
}

function safeParseJSON<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return <span className="text-xs text-muted-foreground">N/A</span>;
  const styles: Record<string, string> = {
    POSITIVE: 'bg-emerald-100 text-emerald-700',
    NEUTRAL: 'bg-yellow-100 text-yellow-700',
    NEGATIVE: 'bg-red-100 text-red-700',
  };
  return (
    <Badge className={`${styles[sentiment] ?? 'bg-gray-100 text-gray-700'} hover:opacity-80`}>
      {sentiment}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    NO_ANSWER: 'bg-gray-100 text-gray-600',
    BUSY: 'bg-yellow-100 text-yellow-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-200 text-gray-500',
  };
  return (
    <Badge variant="outline" className={`${styles[status] ?? ''} border-current`}>
      {status?.replace(/_/g, ' ')}
    </Badge>
  );
}

export default function CallRecordingsPage({ user }: { user: PlaceholderUser }) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [sentimentFilter, setSentimentFilter] = useState('ALL');
  const [hasRecording, setHasRecording] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [remarks, setRemarks] = useState('');

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (statusFilter !== 'ALL') params.set('outcome', statusFilter);
      if (directionFilter !== 'ALL') params.set('direction', directionFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (search) params.set('search', search);

      const res = await fetch(`/api/calls?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch calls');
      const data = await res.json();
      let filtered = data.calls ?? [];

      // Client-side sentiment filter
      if (sentimentFilter !== 'ALL') {
        filtered = filtered.filter((c: CallRecord) => c.aiSentiment === sentimentFilter);
      }
      // Client-side recording filter
      if (hasRecording) {
        filtered = filtered.filter((c: CallRecord) => c.recordingUrl);
      }

      setCalls(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, directionFilter, sentimentFilter, hasRecording, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  function handleSelectCall(call: CallRecord) {
    setSelectedCall(call);
    setExpandedCall(expandedCall === call.id ? null : call.id);
    setRemarks(call.repRemarks ?? '');
  }

  function handleSaveRemarks() {
    // Update local state optimistically
    setCalls((prev) =>
      prev.map((c) => (c.id === selectedCall?.id ? { ...c, repRemarks: remarks } : c))
    );
    if (selectedCall) {
      setSelectedCall({ ...selectedCall, repRemarks: remarks });
    }
  }

  const selectedInterests = selectedCall ? safeParseJSON<string[]>(selectedCall.aiExtractedInterest, []) : [];
  const selectedObjections = selectedCall ? safeParseJSON<string[]>(selectedCall.aiExtractedObjections, []) : [];

  const activeFiltersCount = [
    statusFilter !== 'ALL',
    directionFilter !== 'ALL',
    sentimentFilter !== 'ALL',
    hasRecording,
    dateFrom !== '',
    dateTo !== '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Call Recordings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review recorded calls, AI transcripts, coaching flags, and analysis.
          </p>
        </div>
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 w-fit">
          {calls.length} calls
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 ml-1">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ANSWERED">Completed</SelectItem>
                  <SelectItem value="UNANSWERED">No Answer</SelectItem>
                  <SelectItem value="BUSY">Busy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Direction</label>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Directions</SelectItem>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Sentiment</label>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sentiments</SelectItem>
                  <SelectItem value="POSITIVE">Positive</SelectItem>
                  <SelectItem value="NEUTRAL">Neutral</SelectItem>
                  <SelectItem value="NEGATIVE">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search lead name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Switch checked={hasRecording} onCheckedChange={setHasRecording} />
                <label className="text-sm text-muted-foreground">Has Recording</label>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('ALL');
                  setDirectionFilter('ALL');
                  setSentimentFilter('ALL');
                  setHasRecording(false);
                  setDateFrom('');
                  setDateTo('');
                  setSearch('');
                }}
                className="w-full"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load calls: {error}</p>
            <Button variant="outline" className="mt-3" onClick={fetchCalls}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Call Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Mic className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No calls found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Recording</TableHead>
                    <TableHead className="text-center">Sentiment</TableHead>
                    <TableHead className="text-center">AI Analysis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <Fragment key={call.id}>
                      <TableRow
                        key={call.id}
                        className={`cursor-pointer hover:bg-emerald-50/50 transition-colors ${
                          selectedCall?.id === call.id ? 'bg-emerald-50' : ''
                        } ${call.recordingUrl ? 'border-l-4 border-l-emerald-400' : ''}`}
                        onClick={() => handleSelectCall(call)}
                      >
                        <TableCell className="w-10">
                          {expandedCall === call.id ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {call.lead?.firstName} {call.lead?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{call.rep?.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {call.direction === 'INBOUND' ? (
                              <PhoneIncoming className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <span className="text-xs">{call.direction}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs">{format(new Date(call.callTimestamp), 'MMM d, h:mm a')}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(call.callTimestamp), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {formatDuration(call.durationSeconds)}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={call.status} />
                        </TableCell>
                        <TableCell className="text-center">
                          {call.recordingUrl ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                              <Volume2 className="w-3 h-3 mr-1" />
                              Recording
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <SentimentBadge sentiment={call.aiSentiment} />
                        </TableCell>
                        <TableCell className="text-center">
                          {call.aiSummary || call.transcriptText ? (
                            <Brain className="w-4 h-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Detail Row */}
                      {expandedCall === call.id && selectedCall?.id === call.id && (
                        <TableRow key={`${call.id}-detail`} className="hover:bg-transparent bg-gray-50/50">
                          <TableCell colSpan={9} className="p-0">
                            <div className="p-4 space-y-4">
                              {/* Audio Player */}
                              <Card className="border-emerald-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Mic className="w-4 h-4 text-emerald-600" />
                                    Recording Player
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {selectedCall.recordingUrl ? (
                                    <div className="flex items-center gap-3">
                                      <div className="bg-emerald-100 p-2 rounded-full">
                                        <Play className="w-5 h-5 text-emerald-600" />
                                      </div>
                                      <audio controls className="flex-1 h-10" src={selectedCall.recordingUrl}>
                                        Your browser does not support the audio element.
                                      </audio>
                                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                        Recording available
                                      </Badge>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                      <div className="bg-gray-100 p-2 rounded-full">
                                        <Pause className="w-5 h-5" />
                                      </div>
                                      <span className="text-sm">No recording attached to this call.</span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* AI Summary */}
                              {selectedCall.aiSummary && (
                                <Card className="border-blue-200 bg-blue-50/30">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                                      <Brain className="w-4 h-4" />
                                      AI Summary
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-gray-700 leading-relaxed">{selectedCall.aiSummary}</p>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Transcript */}
                              {selectedCall.transcriptText && (
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-emerald-600" />
                                      Transcript
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-4">
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {selectedCall.transcriptText}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* AI Analysis Grid */}
                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-emerald-600" />
                                    AI Analysis
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Interest */}
                                    <div className="bg-gray-50 rounded-lg p-3">
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Interest</p>
                                      {selectedInterests.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {selectedInterests.map((interest, i) => (
                                            <Badge key={i} variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                              {interest}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Not extracted</p>
                                      )}
                                    </div>

                                    {/* Budget */}
                                    <div className="bg-gray-50 rounded-lg p-3">
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Budget</p>
                                      {selectedCall.aiExtractedBudget ? (
                                        <p className="text-sm font-medium text-emerald-700">
                                          {selectedCall.aiExtractedBudget}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Not extracted</p>
                                      )}
                                    </div>

                                    {/* Objections */}
                                    <div className="bg-gray-50 rounded-lg p-3">
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Objections</p>
                                      {selectedObjections.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {selectedObjections.map((obj, i) => (
                                            <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                              {obj}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">No objections</p>
                                      )}
                                    </div>

                                    {/* Timeline */}
                                    <div className="bg-gray-50 rounded-lg p-3">
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Timeline</p>
                                      {selectedCall.aiExtractedTimeline ? (
                                        <p className="text-sm font-medium text-emerald-700">
                                          {selectedCall.aiExtractedTimeline}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Not extracted</p>
                                      )}
                                    </div>

                                    {/* Sentiment */}
                                    <div className="bg-gray-50 rounded-lg p-3">
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Sentiment</p>
                                      <SentimentBadge sentiment={selectedCall.aiSentiment} />
                                    </div>

                                    {/* Coaching Flag */}
                                    <div className="bg-gray-50 rounded-lg p-3">
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Coaching</p>
                                      {selectedCall.aiCoachingFlag ? (
                                        <div className="space-y-1">
                                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            Flagged
                                          </Badge>
                                          {selectedCall.aiCoachingNote && (
                                            <p className="text-xs text-red-600 mt-1">{selectedCall.aiCoachingNote}</p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-emerald-600">No issues detected</p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Rep Remarks */}
                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <User className="w-4 h-4 text-emerald-600" />
                                    Rep Remarks
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <Textarea
                                      value={remarks}
                                      onChange={(e) => setRemarks(e.target.value)}
                                      placeholder="Add your notes about this call..."
                                      className="min-h-[80px] resize-y"
                                    />
                                    <div className="flex justify-end">
                                      <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        onClick={handleSaveRemarks}
                                      >
                                        <Save className="w-3.5 h-3.5 mr-1.5" />
                                        Save Remarks
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
