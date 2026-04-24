'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Loader2,
  CheckCircle2,
  Users,
  Phone,
  Clock,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

type ExportType = 'leads' | 'calls' | 'followups' | 'memberships';
type ExportFormat = 'csv' | 'json' | 'xlsx';
type ExportStatus = 'idle' | 'preparing' | 'ready' | 'downloaded';

interface ExportOption {
  id: ExportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { id: 'leads', label: 'Leads', description: 'All lead data including scores, sources, and status', icon: <Users className="w-5 h-5" /> },
  { id: 'calls', label: 'Calls', description: 'Call history with outcomes and durations', icon: <Phone className="w-5 h-5" /> },
  { id: 'followups', label: 'Follow-Ups', description: 'Follow-up tasks with priorities and status', icon: <Clock className="w-5 h-5" /> },
  { id: 'memberships', label: 'Memberships', description: 'Membership plans linked to leads', icon: <CreditCard className="w-5 h-5" /> },
];

export default function DataExportPage({ user }: { user: User }) {
  const { toast } = useToast();

  const [exportType, setExportType] = useState<ExportType>('leads');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');

  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [previewKeys, setPreviewKeys] = useState<string[]>([]);

  const fetchData = useCallback(async (type: ExportType) => {
    setDataLoading(true);
    setExportStatus('idle');
    setData([]);
    setPreviewData([]);
    setPreviewKeys([]);

    try {
      let res: Response;
      let json: Record<string, unknown>;
      let records: Record<string, unknown>[] = [];

      switch (type) {
        case 'leads':
          res = await fetch('/api/leads?limit=1000');
          json = await res.json();
          records = (json.leads as Record<string, unknown>[]) ?? [];
          break;
        case 'calls':
          res = await fetch('/api/calls?limit=1000');
          json = await res.json();
          records = (json.calls as Record<string, unknown>[]) ?? [];
          break;
        case 'followups':
          res = await fetch('/api/followups?limit=1000');
          json = await res.json();
          records = (json.followUps as Record<string, unknown>[]) ?? [];
          break;
        case 'memberships':
          res = await fetch('/api/leads?limit=1000');
          json = await res.json();
          records = (json.leads as Record<string, unknown>[]) ?? [];
          break;
      }

      // Filter by date range if provided
      if (dateFrom) {
        const from = new Date(dateFrom);
        records = records.filter((r) => {
          const dateField = r.createdAt || r.callTimestamp || r.dueDatetime;
          if (!dateField) return true;
          return new Date(dateField as string) >= from;
        });
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        records = records.filter((r) => {
          const dateField = r.createdAt || r.callTimestamp || r.dueDatetime;
          if (!dateField) return true;
          return new Date(dateField as string) <= to;
        });
      }

      setData(records);

      // Set preview (first 5 rows)
      const preview = records.slice(0, 5);
      setPreviewData(preview);

      if (preview.length > 0) {
        const keys = Object.keys(preview[0]).filter(
          (k) => typeof preview[0][k] !== 'object' || preview[0][k] === null
        );
        setPreviewKeys(keys);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setDataLoading(false);
    }
  }, [toast, dateFrom, dateTo]);

  useEffect(() => {
    fetchData(exportType);
  }, [exportType, fetchData]);

  // Format cell value for display
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return '—'; }
    }
    const str = String(value);
    // Try to format ISO dates
    if (str.match(/^\d{4}-\d{2}-\d{2}T/)) {
      try { return format(new Date(str), 'yyyy-MM-dd HH:mm'); } catch { return str; }
    }
    return str;
  };

  // Friendly column names
  const friendlyName = (key: string): string => {
    const names: Record<string, string> = {
      id: 'ID',
      firstName: 'First Name',
      lastName: 'Last Name',
      phone: 'Phone',
      email: 'Email',
      source: 'Source',
      leadType: 'Lead Type',
      leadScore: 'Lead Score',
      temperature: 'Temperature',
      status: 'Status',
      assignedRepId: 'Rep ID',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      callTimestamp: 'Call Time',
      durationSeconds: 'Duration (s)',
      outcome: 'Outcome',
      direction: 'Direction',
      dueDatetime: 'Due Date',
      priority: 'Priority',
      reason: 'Reason',
      completedAt: 'Completed At',
      leadId: 'Lead ID',
      repId: 'Rep ID',
    };
    return names[key] || key;
  };

  // Generate export file and download
  const handleExport = async () => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'No records to export' });
      return;
    }

    setExportStatus('preparing');
    const timestamp = format(new Date(), 'yyyy-MM-dd');

    // Small delay to show "Preparing..." state
    await new Promise((r) => setTimeout(r, 600));

    try {
      const exportData = data.map((row) => {
        const clean: Record<string, unknown> = {};
        previewKeys.forEach((key) => {
          const val = row[key];
          // Flatten nested objects to string
          if (typeof val === 'object' && val !== null) {
            if (val && typeof (val as Record<string, unknown>).name === 'string') {
              clean[key] = (val as Record<string, unknown>).name;
            } else {
              clean[key] = JSON.stringify(val);
            }
          } else {
            clean[key] = val;
          }
        });
        return clean;
      });

      const filenamePrefix = `sp-crm-${exportType}-export`;

      if (exportFormat === 'csv') {
        const headers = previewKeys.map(friendlyName).join(',');
        const rows = exportData.map((row) =>
          previewKeys.map((k) => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenamePrefix}-${timestamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'json') {
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenamePrefix}-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, exportType.charAt(0).toUpperCase() + exportType.slice(1));
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenamePrefix}-${timestamp}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setExportStatus('downloaded');
      toast({ title: 'Export Complete', description: `${data.length} records exported as ${exportFormat.toUpperCase()}` });
    } catch {
      setExportStatus('idle');
      toast({ title: 'Export Failed', description: 'Could not generate export file', variant: 'destructive' });
    }
  };

  const statusBadge = () => {
    if (exportStatus === 'preparing') {
      return (
        <Badge variant="outline" className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200">
          <Loader2 className="w-3 h-3 animate-spin" />
          Preparing...
        </Badge>
      );
    }
    if (exportStatus === 'downloaded') {
      return (
        <Badge variant="outline" className="gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Downloaded
        </Badge>
      );
    }
    if (data.length > 0) {
      return (
        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
          Ready &middot; {data.length} records
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Download className="w-6 h-6 text-emerald-600" />
          Data Export
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Export CRM data in various formats for analysis and reporting
        </p>
      </div>

      {/* Export Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EXPORT_OPTIONS.map((opt) => (
          <Card
            key={opt.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              exportType === opt.id
                ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30'
                : 'hover:border-emerald-200'
            }`}
            onClick={() => setExportType(opt.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${exportType === opt.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {opt.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date Range */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Date Range</CardTitle>
            <CardDescription>Optional: filter data by date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom" className="text-sm">From</Label>
                <input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label htmlFor="dateTo" className="text-sm">To</Label>
                <input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Format Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export Format</CardTitle>
            <CardDescription>Choose the file format for export</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)} className="space-y-3">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label htmlFor="format-csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-sm font-medium">CSV</span>
                    <p className="text-xs text-muted-foreground">Comma-separated values</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="json" id="format-json" />
                <Label htmlFor="format-json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="text-sm font-medium">JSON</span>
                    <p className="text-xs text-muted-foreground">Structured data format</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="xlsx" id="format-xlsx" />
                <Label htmlFor="format-xlsx" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="text-sm font-medium">Excel (XLSX)</span>
                    <p className="text-xs text-muted-foreground">Microsoft Excel spreadsheet</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Preview Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Preview &mdash; {EXPORT_OPTIONS.find((o) => o.id === exportType)?.label}
              </CardTitle>
              <CardDescription>
                Showing first {previewData.length} of {data.length} records
              </CardDescription>
            </div>
            {statusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : previewData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewKeys.map((key) => (
                      <TableHead key={key} className="text-xs whitespace-nowrap font-medium">
                        {friendlyName(key)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {previewKeys.map((key) => (
                        <TableCell key={key} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                          {formatCellValue(row[key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Download className="w-10 h-10 mx-auto mb-3 opacity-20" />
              No records found. Try adjusting the date range or selecting a different data type.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          disabled={data.length === 0 || exportStatus === 'preparing'}
          className="gap-2 min-w-[180px]"
          size="lg"
        >
          {exportStatus === 'preparing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing Export...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export {data.length} Records
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
