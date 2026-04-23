import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, hashPassword } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// GET /api/users — List all users
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await requireRole('SUPER_ADMIN');

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: {
            assignedLeads: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// POST /api/users — Create a new user
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const body = await request.json();

    const { name, email, phone, password, role } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SALES_REP'];
    const finalRole = validRoles.includes(role) ? role : 'SALES_REP';

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        passwordHash,
        role: finalRole,
      },
    });

    // Create audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'USER',
      entityId: user.id,
      action: 'CREATE',
      remarks: `Created user: ${user.name} (${user.email}) with role ${finalRole}`,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 },
    );
  }
}
