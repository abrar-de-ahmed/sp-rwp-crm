'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface ImportUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: number;
  total: number;
  fileName: string;
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function DataImportPage({ user }: { user: ImportUser }) {
  const { toast } = useToast();

  // Access check — Super Admin only
  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Access Denied</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Only Super Admins can import data.
        </p>
      </div>
    );
  }

  return <ImportContent />;
}

function ImportContent() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload');
  const [result, setResult] = useState<ImportResult | null>(null);

  // Handle file selection
  const handleFile = useCallback((selectedFile: File) => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV or XLSX file.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setStep('upload');
  }, [toast]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }, [handleFile]);

  // Upload handler
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStep('processing');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data as ImportResult);
        setStep('result');
        toast({
          title: 'Import Complete',
          description: `Successfully processed ${data.total} rows.`,
        });
      } else {
        toast({
          title: 'Import Failed',
          description: data.error || 'Failed to process the import.',
          variant: 'destructive',
        });
        setStep('upload');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
      setStep('upload');
    } finally {
      setUploading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setStep('upload');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Data Import</h2>
        <p className="text-sm text-muted-foreground">
          Import leads from CSV or XLSX files into the CRM
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        <StepIndicator
          number={1}
          label="Upload"
          active={step === 'upload' || step === 'processing'}
          completed={step === 'result'}
        />
        <div className="flex-1 h-px bg-border" />
        <StepIndicator
          number={2}
          label="Process"
          active={step === 'processing'}
          completed={step === 'result'}
        />
        <div className="flex-1 h-px bg-border" />
        <StepIndicator
          number={3}
          label="Results"
          active={step === 'result'}
          completed={false}
        />
      </div>

      {/* Step 1: Upload */}
      {(step === 'upload' || step === 'processing') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload File</CardTitle>
            <CardDescription>
              Drag and drop your CSV or XLSX file, or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                transition-all duration-200
                ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : file
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-muted-foreground/25 hover:border-emerald-400 hover:bg-muted/30'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleInputChange}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    Remove file
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drop your file here
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      CSV or XLSX &middot; Max 10 MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>

            {/* Supported Format */}
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Supported columns:
              </p>
              <p className="text-xs text-muted-foreground">
                firstName, lastName, phone, email, source, leadType
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === 'result' && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Results</CardTitle>
            <CardDescription>
              Summary for <span className="font-medium text-foreground">{result.fileName}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Total Rows"
                value={result.total}
                icon={<FileSpreadsheet className="w-4 h-4 text-muted-foreground" />}
                color="bg-muted"
              />
              <StatCard
                label="Imported"
                value={result.imported}
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                color="bg-emerald-50"
              />
              <StatCard
                label="Duplicates"
                value={result.duplicates}
                icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                color="bg-amber-50"
              />
              <StatCard
                label="Errors"
                value={result.errors}
                icon={<XCircle className="w-4 h-4 text-red-600" />}
                color="bg-red-50"
              />
            </div>

            {/* Success Message */}
            {result.imported > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm text-emerald-800">
                    <span className="font-semibold">{result.imported}</span> lead{result.imported !== 1 ? 's' : ''} successfully imported and assigned to sales reps.
                  </p>
                </div>
              </div>
            )}

            {result.duplicates > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">{result.duplicates}</span> duplicate lead{result.duplicates !== 1 ? 's' : ''} skipped (phone number already exists).
                  </p>
                </div>
              </div>
            )}

            {result.errors > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">{result.errors}</span> row{result.errors !== 1 ? 's' : ''} had errors (missing required fields).
                  </p>
                </div>
              </div>
            )}

            {/* Action */}
            <div className="flex justify-end">
              <Button onClick={handleReset} variant="outline">
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// Sub-components
// ──────────────────────────────────────

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
          ${completed ? 'bg-emerald-600 text-white' : active ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' : 'bg-muted text-muted-foreground'}
        `}
      >
        {completed ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          number
        )}
      </div>
      <span
        className={`text-xs font-medium ${
          active || completed ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`${color} rounded-lg p-3 text-center`}>
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
