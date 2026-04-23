import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// GET /api/channels — Return all channel connections
// ──────────────────────────────────────
export async function GET() {
  try {
    const session = await requireAuth();

    const channels = await db.channelConnection.findMany({
      select: {
        id: true,
        channel: true,
        status: true,
        connectedAt: true,
        lastHeartbeatAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { channel: 'asc' },
    });

    // Ensure all three channels are represented
    const channelMap: Record<string, (typeof channels)[0]> = {};
    for (const ch of channels) {
      channelMap[ch.channel] = ch;
    }

    const defaultChannels = ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP'];
    const result = defaultChannels.map((ch) => {
      if (channelMap[ch]) return channelMap[ch];
      return {
        id: '',
        channel: ch,
        status: 'DISCONNECTED',
        connectedAt: null,
        lastHeartbeatAt: null,
        metadata: null,
        createdAt: null,
        updatedAt: null,
      };
    });

    return NextResponse.json({ channels: result });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// POST /api/channels — Create or update a channel connection
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const body = await request.json();

    const { channel, accessToken, metadata } = body;

    if (!channel || !['FACEBOOK', 'INSTAGRAM', 'WHATSAPP'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be FACEBOOK, INSTAGRAM, or WHATSAPP.' },
        { status: 400 },
      );
    }

    // Upsert: find existing or create new
    const existing = await db.channelConnection.findFirst({
      where: { channel },
    });

    let connection;
    if (existing) {
      connection = await db.channelConnection.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          accessToken: accessToken || existing.accessToken,
          metadata: metadata ? JSON.stringify(metadata) : existing.metadata,
          connectedAt: new Date(),
          lastHeartbeatAt: new Date(),
        },
      });
    } else {
      connection = await db.channelConnection.create({
        data: {
          channel,
          status: 'CONNECTED',
          accessToken: accessToken || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          connectedAt: new Date(),
          lastHeartbeatAt: new Date(),
        },
      });
    }

    // Audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'SETTING',
      entityId: connection.id,
      action: 'UPDATE',
      fieldChanged: 'channel_connection',
      newValue: `${channel}: CONNECTED`,
      remarks: `Connected ${channel} channel`,
    });

    return NextResponse.json({ connection }, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to connect channel' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// DELETE /api/channels — Disconnect a channel
// ──────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const { searchParams } = request.nextUrl;
    const channel = searchParams.get('channel');

    if (!channel || !['FACEBOOK', 'INSTAGRAM', 'WHATSAPP'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be FACEBOOK, INSTAGRAM, or WHATSAPP.' },
        { status: 400 },
      );
    }

    const existing = await db.channelConnection.findFirst({
      where: { channel },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 },
      );
    }

    // Mark as disconnected (keep record for audit trail)
    await db.channelConnection.update({
      where: { id: existing.id },
      data: {
        status: 'DISCONNECTED',
        accessToken: null,
        sessionData: null,
        connectedAt: null,
      },
    });

    // Audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'SETTING',
      entityId: existing.id,
      action: 'UPDATE',
      fieldChanged: 'channel_connection',
      oldValue: `${channel}: ${existing.status}`,
      newValue: `${channel}: DISCONNECTED`,
      remarks: `Disconnected ${channel} channel`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to disconnect channel' },
      { status: 500 },
    );
  }
}
