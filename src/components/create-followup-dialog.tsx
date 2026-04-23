'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface LeadOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface CreateFollowupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userRole: string;
  prefillLeadId?: string;
  onSuccess?: () => void;
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function CreateFollowupDialog({
  open,
  onOpenChange,
  userId,
  userRole,
  prefillLeadId,
  onSuccess,
}: CreateFollowupDialogProps) {
  const { toast } = useToast();

  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leadId, setLeadId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [reason, setReason] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

  // Fetch leads for dropdown
  useEffect(() => {
    if (!open) return;

    const fetchLeads = async () => {
      setLoadingLeads(true);
      try {
        const res = await fetch('/api/leads?limit=500&status=NEW,CONTACTED,INTERESTED,NEGOTIATION,BOOKED');
        if (res.ok) {
          const data = await res.json();
          const leadsList: LeadOption[] = (data.leads ?? []).map((l: { id: string; firstName: string; lastName: string }) => ({
            id: l.id,
            firstName: l.firstName,
            lastName: l.lastName,
          }));
          setLeads(leadsList);
        }
      } catch {
        // silent
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [open]);

  // Pre-fill lead when dialog opens
  useEffect(() => {
    if (open && prefillLeadId) {
      setLeadId(prefillLeadId);
    }
    if (!open) {
      // Reset form
      setLeadId('');
      setDueDate('');
      setDueTime('');
      setPriority('NORMAL');
      setReason('');
      setLeadSearch('');
    }
  }, [open, prefillLeadId]);

  const handleSubmit = async () => {
    if (!leadId) {
      toast({ title: 'Error', description: 'Please select a lead', variant: 'destructive' });
      return;
    }
    if (!dueDate || !dueTime) {
      toast({ title: 'Error', description: 'Please set due date and time', variant: 'destructive' });
      return;
    }

    const dueDatetime = new Date(`${dueDate}T${dueTime}`).toISOString();

    setSubmitting(true);
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          assignedToId: userId,
          dueDatetime,
          priority,
          reason: reason.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast({ title: 'Follow-Up Created', description: 'New follow-up has been scheduled.' });
        onOpenChange(false);
        onSuccess?.();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to create follow-up', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create follow-up', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter leads by search
  const filteredLeads = leadSearch
    ? leads.filter(
        (l) =>
          l.firstName.toLowerCase().includes(leadSearch.toLowerCase()) ||
          l.lastName.toLowerCase().includes(leadSearch.toLowerCase()),
      )
    : leads;

  // Set default due time to tomorrow at 10am
  useEffect(() => {
    if (open && !dueDate && !dueTime) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setDueDate(tomorrow.toISOString().split('T')[0]);
      setDueTime('10:00');
    }
  }, [open, dueDate, dueTime]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Follow-Up</DialogTitle>
          <DialogDescription>
            Schedule a new follow-up for a lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Lead</Label>
            {prefillLeadId ? (
              <div className="h-10 rounded-md border bg-muted px-3 flex items-center text-sm">
                {leads.find((l) => l.id === prefillLeadId)
                  ? `${leads.find((l) => l.id === prefillLeadId)!.firstName} ${leads.find((l) => l.id === prefillLeadId)!.lastName}`
                  : 'Selected lead'}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Search leads by name..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                />
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingLeads ? 'Loading leads...' : 'Select a lead'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredLeads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName}
                      </SelectItem>
                    ))}
                    {filteredLeads.length === 0 && !loadingLeads && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        No leads found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Time</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="URGENT">URGENT</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="NORMAL">NORMAL</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason / Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason / Notes</Label>
            <Textarea
              placeholder="Why is this follow-up needed?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !leadId || !dueDate || !dueTime}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Follow-Up'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
