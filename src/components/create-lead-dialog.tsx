'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// ──────────────────────────────────────
// Types & Constants
// ──────────────────────────────────────

interface LeadData {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  whatsappNumber: string;
  source: string;
  leadType: string;
  interestedFacilities: string[];
  familySize: number | null;
  budgetRange: string;
  tags: string[];
  assignedRepId: string;
  metaAdCampaign: string;
  remarks: string;
}

interface SalesRep {
  id: string;
  name: string;
}

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLead?: LeadData | null;
  userId: string;
  userRole: string;
  onSuccess: () => void;
}

const SOURCES = [
  { value: 'MANUAL_IMPORT', label: 'Manual Import' },
  { value: 'META_AD', label: 'Meta Ad' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WALK_IN', label: 'Walk-In' },
  { value: 'REFERRAL', label: 'Referral' },
];

const LEAD_TYPES = [
  { value: 'MEMBERSHIP', label: 'Membership' },
  { value: 'DAY_PASS', label: 'Day Pass' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'EVENT', label: 'Event' },
  { value: 'CORPORATE_EVENT', label: 'Corporate Event' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'CAMP', label: 'Camp' },
  { value: 'OTHER', label: 'Other' },
];

const FACILITIES = [
  'Indoor Cricket',
  'Badminton',
  'Tennis',
  'Futsal',
  'Swimming Pool',
  'Gym',
  'Bowling',
  'Basketball',
  'Steam/Sauna',
  'Cafe',
];

const BUDGET_RANGES = [
  { value: 'UNDER_10K', label: 'Under 10K PKR' },
  { value: '10K_15K', label: '10K - 15K PKR' },
  { value: '15K_25K', label: '15K - 25K PKR' },
  { value: '25K_50K', label: '25K - 50K PKR' },
  { value: '50K_PLUS', label: '50K+ PKR' },
  { value: 'NOT_DISCLOSED', label: 'Not Disclosed' },
];

const emptyFormData: LeadData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  whatsappNumber: '',
  source: 'MANUAL_IMPORT',
  leadType: 'OTHER',
  interestedFacilities: [],
  familySize: null,
  budgetRange: '',
  tags: [],
  assignedRepId: '',
  metaAdCampaign: '',
  remarks: '',
};

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function CreateLeadDialog({
  open,
  onOpenChange,
  editLead,
  userId,
  userRole,
  onSuccess,
}: CreateLeadDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [formData, setFormData] = useState<LeadData>(emptyFormData);
  const [tagsInput, setTagsInput] = useState('');

  const isEdit = !!editLead?.id;
  const isRep = userRole === 'SALES_REP';

  // Fetch sales reps for admin/super admin
  useEffect(() => {
    if (!isRep) {
      fetch('/api/dashboard/stats')
        .then((res) => res.json())
        .then((data) => {
          if (data.repPerformance) {
            setSalesReps(data.repPerformance.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
          }
        })
        .catch(() => {
          // Fallback: fetch users
          // We'll just leave the dropdown empty if it fails
        });
    }
  }, [isRep, open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editLead) {
        setFormData({ ...editLead });
        setTagsInput(editLead.tags.join(', '));
      } else {
        setFormData({ ...emptyFormData, assignedRepId: isRep ? userId : '' });
        setTagsInput('');
      }
    }
  }, [open, editLead, userId, isRep]);

  const handleFacilityToggle = (facility: string) => {
    setFormData((prev) => ({
      ...prev,
      interestedFacilities: prev.interestedFacilities.includes(facility)
        ? prev.interestedFacilities.filter((f) => f !== facility)
        : [...prev.interestedFacilities, facility],
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.firstName.trim()) {
      toast({ title: 'Validation Error', description: 'First name is required', variant: 'destructive' });
      return;
    }
    if (!formData.lastName.trim()) {
      toast({ title: 'Validation Error', description: 'Last name is required', variant: 'destructive' });
      return;
    }
    if (!formData.phone.trim()) {
      toast({ title: 'Validation Error', description: 'Phone number is required', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const url = isEdit ? `/api/leads/${editLead.id}` : '/api/leads';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: isEdit ? 'Lead Updated' : 'Lead Created',
        description: isEdit
          ? `${formData.firstName} ${formData.lastName} has been updated successfully.`
          : `${formData.firstName} ${formData.lastName} has been created successfully.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save lead. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEdit ? 'Edit Lead' : 'Create New Lead'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the lead information below.'
              : 'Fill in the details to create a new lead.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>

          {/* Contact Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="+92 300 1234567"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                placeholder="+92 300 1234567"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, source: v }))}
              >
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadType">Lead Type</Label>
              <Select
                value={formData.leadType}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, leadType: v }))}
              >
                <SelectTrigger id="leadType">
                  <SelectValue placeholder="Select lead type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_TYPES.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value}>
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetRange">Budget Range</Label>
              <Select
                value={formData.budgetRange || '__none__'}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, budgetRange: v === '__none__' ? '' : v }))
                }
              >
                <SelectTrigger id="budgetRange">
                  <SelectValue placeholder="Select budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  {BUDGET_RANGES.map((br) => (
                    <SelectItem key={br.value} value={br.value}>
                      {br.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Family Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="familySize">Family Size</Label>
              <Input
                id="familySize"
                type="number"
                min="1"
                max="50"
                placeholder="1"
                value={formData.familySize ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    familySize: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="vip, corporate, urgent"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
          </div>

          {/* Meta Ad Campaign */}
          <div className="space-y-2">
            <Label htmlFor="metaAdCampaign">Meta Ad Campaign</Label>
            <Input
              id="metaAdCampaign"
              placeholder="Campaign name or ID"
              value={formData.metaAdCampaign}
              onChange={(e) => setFormData((prev) => ({ ...prev, metaAdCampaign: e.target.value }))}
            />
          </div>

          {/* Assigned Rep (Admin/Super Admin only) */}
          {!isRep && (
            <div className="space-y-2">
              <Label htmlFor="assignedRep">Assigned Sales Rep</Label>
              <Select
                value={formData.assignedRepId || '__auto__'}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    assignedRepId: v === '__auto__' ? '' : v,
                  }))
                }
              >
                <SelectTrigger id="assignedRep">
                  <SelectValue placeholder="Auto-assign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto-assign (Round Robin)</SelectItem>
                  {salesReps.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id}>
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Interested Facilities */}
          <div className="space-y-3">
            <Label>Interested Facilities</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FACILITIES.map((facility) => (
                <div key={facility} className="flex items-center gap-2">
                  <Checkbox
                    id={`facility-${facility}`}
                    checked={formData.interestedFacilities.includes(facility)}
                    onCheckedChange={() => handleFacilityToggle(facility)}
                  />
                  <Label
                    htmlFor={`facility-${facility}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {facility}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Initial Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Any initial notes about this lead..."
              value={formData.remarks}
              onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Update Lead' : 'Create Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
