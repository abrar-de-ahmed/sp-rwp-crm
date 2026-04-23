import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';
import * as XLSX from 'xlsx';

// ──────────────────────────────────────
// POST /api/import — Import leads from CSV/XLSX
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole('SUPER_ADMIN');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();

    let rows: Record<string, string>[];

    if (fileName.endsWith('.csv')) {
      const text = await file.text();
      rows = parseCSV(text);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      rows = parseXLSX(buffer);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload a CSV or XLSX file.' },
        { status: 400 },
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'File contains no data rows' },
        { status: 400 },
      );
    }

    // Get mapping from form data
    const mappingStr = formData.get('mapping') as string | null;
    let columnMapping: Record<string, string> = {};
    if (mappingStr) {
      try {
        columnMapping = JSON.parse(mappingStr);
      } catch {
        // fallback to no mapping
      }
    }

    // Import rows
    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const total = rows.length;

    for (const row of rows) {
      try {
        // Map columns based on mapping
        const firstName = getMappedValue(row, columnMapping, 'firstName');
        const lastName = getMappedValue(row, columnMapping, 'lastName');
        const phone = getMappedValue(row, columnMapping, 'phone');
        const email = getMappedValue(row, columnMapping, 'email');
        const source = getMappedValue(row, columnMapping, 'source') || 'MANUAL_IMPORT';
        const leadType = getMappedValue(row, columnMapping, 'leadType');

        // Validate required fields — need at least a name or phone
        const cleanPhone = phone?.replace(/\D/g, '') || '';
        const cleanFirst = firstName?.trim() || '';
        const cleanLast = lastName?.trim() || '';

        if (!cleanPhone && !cleanFirst && !cleanLast) {
          errors++;
          continue;
        }

        // Check for duplicate by phone
        if (cleanPhone) {
          const existing = await db.lead.findUnique({
            where: { phone: cleanPhone },
          });
          if (existing) {
            duplicates++;
            continue;
          }
        }

        // Find an active sales rep for assignment (round-robin by least leads)
        const activeReps = await db.user.findMany({
          where: { role: 'SALES_REP', isActive: true },
          select: { id: true },
          orderBy: { id: 'asc' },
        });

        let assignedRepId: string | null = null;
        if (activeReps.length > 0) {
          const repCounts = await Promise.all(
            activeReps.map(async (rep) => {
              const count = await db.lead.count({
                where: { assignedRepId: rep.id, status: { not: 'LOST' } },
              });
              return { id: rep.id, count };
            }),
          );
          repCounts.sort((a, b) => a.count - b.count);
          assignedRepId = repCounts[0].id;
        }

        // Create the lead
        await db.lead.create({
          data: {
            firstName: cleanFirst || 'Unknown',
            lastName: cleanLast || '',
            phone: cleanPhone || `IMPORT_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            email: email?.trim() || null,
            source: source.toUpperCase() || 'MANUAL_IMPORT',
            leadType: leadType?.toUpperCase() || 'OTHER',
            assignedRepId,
          },
        });

        imported++;
      } catch {
        errors++;
      }
    }

    // Create audit log for the import action
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'LEAD',
      action: 'CREATE',
      remarks: `Bulk import from "${file.name}": ${imported} imported, ${duplicates} duplicates, ${errors} errors out of ${total} total rows`,
    });

    return NextResponse.json({
      imported,
      duplicates,
      errors,
      total,
      fileName: file.name,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 },
    );
  }
}

// GET /api/import — List import history from audit logs
export async function GET() {
  try {
    const session = await requireAuth();
    await requireRole('SUPER_ADMIN');

    const importLogs = await db.auditLog.findMany({
      where: {
        entityType: 'LEAD',
        action: 'CREATE',
        remarks: { contains: 'Bulk import' },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        actorName: true,
        remarks: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ imports: importLogs });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch import history' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// CSV Parser (handles quoted fields)
// ──────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const key = header.trim();
      if (key) {
        row[key] = (values[idx] || '').trim();
      }
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

// ──────────────────────────────────────
// XLSX Parser
// ──────────────────────────────────────
function parseXLSX(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return jsonRows.map((row) => {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key] = String(value);
    }
    return result;
  });
}

// ──────────────────────────────────────
// Helper: Get value from row using mapping
// ──────────────────────────────────────
function getMappedValue(
  row: Record<string, string>,
  mapping: Record<string, string>,
  crmField: string,
): string {
  // Find the source column mapped to this CRM field
  const sourceColumn = Object.entries(mapping).find(
    ([, target]) => target === crmField,
  )?.[0];

  if (!sourceColumn) return '';

  // Try exact column name first
  if (row[sourceColumn] !== undefined) return row[sourceColumn];

  // Try case-insensitive lookup
  const lowerKey = sourceColumn.toLowerCase();
  for (const [key, value] of Object.entries(row)) {
    if (key.toLowerCase() === lowerKey) return value;
  }

  return '';
}
