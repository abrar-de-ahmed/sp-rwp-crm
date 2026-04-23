'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  GripVertical,
  Phone,
  User,
  Inbox,
  Loader2,
} from 'lucide-react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface PipelineUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PipelineLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  source: string;
  leadScore: number;
  temperature: string;
  status: string;
  assignedRepId: string | null;
  assignedRep: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface PipelineData {
  columns: Record<string, PipelineLead[]>;
}

interface PipelinePageProps {
  user: PipelineUser;
  onNavigateToLead?: (leadId: string) => void;
}

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────

const PIPELINE_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATION', 'BOOKED', 'LOST'] as const;

const COLUMN_CONFIG: Record<string, { label: string; color: string; bgColor: string; headerBg: string }> = {
  NEW: { label: 'New', color: 'text-slate-700', bgColor: 'bg-slate-50', headerBg: 'bg-slate-100' },
  CONTACTED: { label: 'Contacted', color: 'text-blue-700', bgColor: 'bg-blue-50/30', headerBg: 'bg-blue-50' },
  INTERESTED: { label: 'Interested', color: 'text-emerald-700', bgColor: 'bg-emerald-50/30', headerBg: 'bg-emerald-50' },
  NEGOTIATION: { label: 'Negotiation', color: 'text-amber-700', bgColor: 'bg-amber-50/30', headerBg: 'bg-amber-50' },
  BOOKED: { label: 'Booked', color: 'text-green-700', bgColor: 'bg-green-50/30', headerBg: 'bg-green-50' },
  LOST: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-50/30', headerBg: 'bg-red-50' },
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

// ──────────────────────────────────────
// Sortable Card Component
// ──────────────────────────────────────

function SortableCard({
  lead,
  onClick,
}: {
  lead: PipelineLead;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const avatarColors = [
    'bg-emerald-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-teal-500',
  ];
  const colorIndex = (lead.assignedRep?.name ?? '').charCodeAt(0) % avatarColors.length;
  const avatarColor = avatarColors[colorIndex];
  const initials = (lead.assignedRep?.name ?? '??')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-border/60 shadow-sm p-3 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/50" />
        </button>

        {/* Card content */}
        <div className="flex-1 min-w-0">
          {/* Name & Phone */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {lead.firstName} {lead.lastName}
            </p>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono flex-shrink-0 ${
                lead.leadScore >= 80
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : lead.leadScore >= 50
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {lead.leadScore}
            </Badge>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>

          {/* Source badge & Avatar */}
          <div className="flex items-center justify-between mt-2 gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] ${
                sourceBadgeColors[lead.source] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {sourceLabels[lead.source] ?? lead.source}
            </Badge>

            {lead.assignedRep && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div
                  className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center`}
                  title={lead.assignedRep.name}
                >
                  <span className="text-[9px] text-white font-bold leading-none">
                    {initials}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Drag Overlay Card
// ──────────────────────────────────────

function DragOverlayCard({ lead }: { lead: PipelineLead | null }) {
  if (!lead) return null;
  return (
    <div className="bg-white rounded-lg border border-emerald-300 shadow-lg p-3 w-[250px] rotate-3 opacity-90">
      <p className="text-sm font-semibold text-foreground">
        {lead.firstName} {lead.lastName}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>
    </div>
  );
}

// ──────────────────────────────────────
// Pipeline Column Component
// ──────────────────────────────────────

function PipelineColumn({
  status,
  leads,
  onCardClick,
}: {
  status: string;
  leads: PipelineLead[];
  onCardClick: (lead: PipelineLead) => void;
}) {
  const config = COLUMN_CONFIG[status] ?? COLUMN_CONFIG.NEW;
  const isLost = status === 'LOST';

  return (
    <div
      className={`flex-shrink-0 w-[260px] md:w-[270px] flex flex-col rounded-xl ${
        isLost ? 'bg-muted/80 border border-border/40' : 'bg-muted/40'
      }`}
    >
      {/* Column Header */}
      <div
        className={`px-3 py-2.5 rounded-t-xl ${isLost ? 'bg-red-100/60' : config.headerBg}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLost ? (
              <div className="w-2 h-2 rounded-full bg-red-500" />
            ) : (
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    status === 'NEW'
                      ? '#94a3b8'
                      : status === 'CONTACTED'
                        ? '#3b82f6'
                        : status === 'INTERESTED'
                          ? '#10b981'
                          : status === 'NEGOTIATION'
                            ? '#f59e0b'
                            : '#22c55e',
                }}
              />
            )}
            <h3 className={`text-sm font-semibold ${isLost ? 'text-red-700' : config.color}`}>
              {config.label}
            </h3>
          </div>
          <Badge
            variant="secondary"
            className={`text-xs font-mono h-5 min-w-[20px] flex items-center justify-center ${
              isLost ? 'bg-red-200 text-red-800' : 'bg-background/80'
            }`}
          >
            {leads.length}
          </Badge>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto min-h-[100px]">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
              <Inbox className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground/60">
                No leads here
              </p>
            </div>
          ) : (
            leads.map((lead) => (
              <SortableCard
                key={lead.id}
                lead={lead}
                onClick={() => onCardClick(lead)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Main Pipeline Page Component
// ──────────────────────────────────────

export default function PipelinePage({ user, onNavigateToLead }: PipelinePageProps) {
  const { toast } = useToast();
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [myLeads, setMyLeads] = useState(false);
  const [activeCard, setActiveCard] = useState<PipelineLead | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (myLeads) params.set('myLeads', 'true');

      const res = await fetch(`/api/pipeline?${params}`);
      if (res.ok) {
        const data: PipelineData = await res.json();
        setPipeline(data);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch pipeline', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, myLeads, toast]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Find which column a lead belongs to
  const findColumnForLead = useCallback(
    (leadId: string): string | null => {
      if (!pipeline) return null;
      for (const [status, leads] of Object.entries(pipeline.columns)) {
        if (leads.some((l) => l.id === leadId)) return status;
      }
      return null;
    },
    [pipeline],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
      const { active, over } = event;
      setActiveCard(null);

      if (!over || active.id === over.id) return;

      const leadId = String(active.id);
      const overId = String(over.id);

      // Determine target column
      let targetStatus: string | null = null;

      // Check if dropped directly on a column (column ids match status names)
      if (PIPELINE_STATUSES.includes(overId as typeof PIPELINE_STATUSES[number])) {
        targetStatus = overId;
      } else {
        // Dropped on a card — find which column that card is in
        targetStatus = findColumnForLead(overId);
      }

      // Find source column
      const sourceStatus = findColumnForLead(leadId);

      if (!targetStatus || !sourceStatus || targetStatus === sourceStatus) return;

      // Find the lead being moved
      const lead = pipeline?.columns[sourceStatus]?.find((l) => l.id === leadId);
      if (!lead) return;

      // Update status via API
      setStatusUpdating(leadId);
      try {
        const body: Record<string, string> = { status: targetStatus };
        if (targetStatus === 'LOST') {
          body.lostReason = 'OTHER';
        }

        const res = await fetch(`/api/leads/${leadId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          toast({
            title: 'Lead Moved',
            description: `${lead.firstName} ${lead.lastName} moved to ${COLUMN_CONFIG[targetStatus]?.label ?? targetStatus}`,
          });
          fetchPipeline();
        } else {
          const data = await res.json();
          toast({
            title: 'Error',
            description: data.error || 'Failed to move lead',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to move lead',
          variant: 'destructive',
        });
      } finally {
        setStatusUpdating(null);
      }
    },
    [pipeline, findColumnForLead, fetchPipeline, toast],
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: { active: { id: string | number } }) => {
      const leadId = String(event.active.id);
      if (!pipeline) return;
      for (const leads of Object.values(pipeline.columns)) {
        const found = leads.find((l) => l.id === leadId);
        if (found) {
          setActiveCard(found);
          break;
        }
      }
    },
    [pipeline],
  );

  // Handle card click → navigate to lead detail
  const handleCardClick = useCallback(
    (lead: PipelineLead) => {
      if (onNavigateToLead) {
        onNavigateToLead(lead.id);
      }
    },
    [onNavigateToLead],
  );

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sales Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Drag leads between stages to update their status
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </form>

        {isAdmin && (
          <div className="flex items-center bg-muted rounded-lg p-1 self-start">
            <button
              onClick={() => setMyLeads(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !myLeads
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Leads
            </button>
            <button
              onClick={() => setMyLeads(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                myLeads
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-3 h-3" />
              My Leads
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STATUSES.map((status) => (
            <div key={status} className="flex-shrink-0 w-[260px] md:w-[270px]">
              <Skeleton className="h-10 rounded-t-xl mb-2" />
              <div className="space-y-2">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : pipeline ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Use a wrapper that participates in the DndContext for column-level drops */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {/* Regular columns */}
            {PIPELINE_STATUSES.filter((s) => s !== 'LOST').map((status) => (
              <div
                key={status}
                className="snap-start"
                data-column-id={status}
              >
                <PipelineColumn
                  status={status}
                  leads={pipeline.columns[status] ?? []}
                  onCardClick={handleCardClick}
                />
              </div>
            ))}

            {/* Separator for LOST column */}
            <div className="w-px bg-border/40 flex-shrink-0 my-2 hidden md:block" />

            {/* LOST column */}
            <div className="snap-start" data-column-id="LOST">
              <PipelineColumn
                status="LOST"
                leads={pipeline.columns.LOST ?? []}
                onCardClick={handleCardClick}
              />
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            <DragOverlayCard lead={activeCard} />
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load pipeline</p>
        </div>
      )}

      {/* Status update overlay */}
      {statusUpdating && (
        <div className="fixed inset-0 bg-black/5 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-background rounded-lg shadow-lg px-6 py-4 flex items-center gap-3 pointer-events-auto">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-sm font-medium">Updating lead status...</span>
          </div>
        </div>
      )}
    </div>
  );
}
