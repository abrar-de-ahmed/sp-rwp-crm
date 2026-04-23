import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// GET /api/leads — List leads with filters
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;

    const search = searchParams.get('search') ?? '';
    const source = searchParams.get('source') ?? '';
    const temperature = searchParams.get('temperature') ?? '';
    const status = searchParams.get('status') ?? '';
    const leadType = searchParams.get('leadType') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    // Build where clause
    const where: Record<string, unknown> = {};

    // Role-based filtering: reps see only their leads
    if (session.user.role === 'SALES_REP') {
      where.assignedRepId = session.user.id;
    }

    // Search filter (name, phone, email)
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (source) where.source = source;
    if (temperature) where.temperature = temperature;
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
    }
    if (leadType) where.leadType = leadType;

    // Fetch leads with pagination
    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          source: true,
          leadType: true,
          leadScore: true,
          temperature: true,
          status: true,
          assignedRepId: true,
          assignedRep: {
            select: { id: true, name: true },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.lead.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      leads,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// POST /api/leads — Create a new lead
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { firstName, lastName, phone, email, whatsappNumber, source, leadType, interestedFacilities, familySize, budgetRange, tags, assignedRepId, metaAdCampaign, remarks } = body;

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'First name, last name, and phone are required' },
        { status: 400 },
      );
    }

    // Check for existing phone number to prevent duplicates
    const existing = await db.lead.findUnique({
      where: { phone: phone.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A lead with this phone number already exists' },
        { status: 409 },
      );
    }

    // Determine assigned rep
    let repId = assignedRepId;

    // Sales reps can only assign to themselves
    if (session.user.role === 'SALES_REP') {
      repId = session.user.id;
    }

    // Super Admin: round-robin assignment if no rep specified
    if (!repId && (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN')) {
      const activeReps = await db.user.findMany({
        where: { role: 'SALES_REP', isActive: true },
        select: { id: true },
        orderBy: { id: 'asc' },
      });

      if (activeReps.length > 0) {
        // Simple round-robin: count leads per rep and assign to the one with fewest
        const repCounts = await Promise.all(
          activeReps.map(async (rep) => {
            const count = await db.lead.count({
              where: { assignedRepId: rep.id, status: { not: 'LOST' } },
            });
            return { id: rep.id, count };
          }),
        );

        repCounts.sort((a, b) => a.count - b.count);
        repId = repCounts[0].id;
      }
    }

    // Sales reps without a specified rep get themselves
    if (!repId) {
      repId = session.user.id;
    }

    // Validate rep exists
    if (repId) {
      const rep = await db.user.findUnique({ where: { id: repId } });
      if (!rep) {
        return NextResponse.json(
          { error: 'Assigned rep not found' },
          { status: 400 },
        );
      }
    }

    // Create the lead
    const lead = await db.lead.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        whatsappNumber: whatsappNumber?.trim() || null,
        source: source || 'MANUAL_IMPORT',
        leadType: leadType || 'OTHER',
        interestedFacilities: JSON.stringify(interestedFacilities || []),
        familySize: familySize || null,
        budgetRange: budgetRange || null,
        tags: JSON.stringify(tags || []),
        assignedRepId: repId,
        metaAdCampaign: metaAdCampaign?.trim() || null,
        remarks: remarks?.trim() || '',
      },
    });

    // Create audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'LEAD',
      entityId: lead.id,
      action: 'CREATE',
      remarks: `Created lead: ${lead.firstName} ${lead.lastName}`,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 },
    );
  }
}
