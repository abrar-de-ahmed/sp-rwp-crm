import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ──────────────────────────────────────
// GET /api/users/[id] — Get single user
// ──────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole('SUPER_ADMIN');
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedLeads: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// PUT /api/users/[id] — Update user
// ──────────────────────────────────────
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const { id } = await params;
    const body = await request.json();

    const { name, email, phone, role, isActive } = body;

    // Verify user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Prevent self-deactivation
    if (id === session.user.id && isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 },
      );
    }

    // Check email uniqueness if changing
    if (email && email.trim().toLowerCase() !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 },
        );
      }
    }

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SALES_REP'];

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name?.trim()) updateData.name = name.trim();
    if (email?.trim()) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (role && validRoles.includes(role)) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
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
    });

    // Determine what changed for audit log
    const changes: string[] = [];
    if (name?.trim() && name.trim() !== existingUser.name) changes.push(`name: ${existingUser.name} → ${name.trim()}`);
    if (email?.trim() && email.trim().toLowerCase() !== existingUser.email) changes.push(`email: ${existingUser.email} → ${email.trim()}`);
    if (role && role !== existingUser.role) changes.push(`role: ${existingUser.role} → ${role}`);
    if (typeof isActive === 'boolean' && isActive !== existingUser.isActive) changes.push(`status: ${existingUser.isActive ? 'Active' : 'Inactive'} → ${isActive ? 'Active' : 'Inactive'}`);

    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'USER',
      entityId: id,
      action: 'UPDATE',
      remarks: `Updated user ${existingUser.name}: ${changes.join(', ')}`,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// DELETE /api/users/[id] — Delete user
// ──────────────────────────────────────
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 },
      );
    }

    // Verify user exists
    const existingUser = await db.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignedLeads: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Cannot delete user with assigned leads
    if (existingUser._count.assignedLeads > 0) {
      return NextResponse.json(
        { error: `Cannot delete user: ${existingUser._count.assignedLeads} lead(s) are assigned. Reassign or remove leads first.` },
        { status: 400 },
      );
    }

    // Delete user
    await db.user.delete({ where: { id } });

    // Create audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'USER',
      entityId: id,
      action: 'DELETE',
      remarks: `Deleted user: ${existingUser.name} (${existingUser.email})`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 },
    );
  }
}
