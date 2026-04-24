import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const session = await requireAuth();
    const role = session.user.role;
    const userId = session.user.id;

    // Build where clause based on role
    const leadWhere: Record<string, unknown> = {};
    const callWhere: Record<string, unknown> = {};
    const followUpWhere: Record<string, unknown> = { status: 'PENDING' };

    if (role === 'SALES_REP') {
      leadWhere.assignedRepId = userId;
      callWhere.repId = userId;
      followUpWhere.assignedToId = userId;
    }
    // ADMIN and SUPER_ADMIN see all data (no rep filter)

    // Get today's start and end
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Run all queries in parallel
    const [
      newLeadsResult,
      callsTodayResult,
      conversionsResult,
      pendingFollowUpsResult,
      hotLeadsResult,
      followUpsResult,
    ] = await Promise.all([
      // New leads count
      db.lead.count({
        where: { ...leadWhere, status: 'NEW' },
      }),

      // Calls today
      db.call.count({
        where: {
          ...callWhere,
          callTimestamp: { gte: today, lte: endOfDay },
        },
      }),

      // Conversions today (leads with status BOOKED, updated today)
      db.lead.count({
        where: {
          ...leadWhere,
          status: 'BOOKED',
          updatedAt: { gte: today, lte: endOfDay },
        },
      }),

      // Pending follow-ups
      db.followUp.count({
        where: followUpWhere,
      }),

      // Hot leads
      db.lead.findMany({
        where: { ...leadWhere, temperature: 'HOT' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          leadScore: true,
          temperature: true,
          status: true,
          phone: true,
          source: true,
        },
        orderBy: { leadScore: 'desc' },
        take: 10,
      }),

      // Upcoming follow-ups
      db.followUp.findMany({
        where: { ...followUpWhere, dueDatetime: { gte: new Date() } },
        select: {
          id: true,
          dueDatetime: true,
          priority: true,
          status: true,
          lead: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { dueDatetime: 'asc' },
        take: 10,
      }),
    ]);

    // Build response
    const response: Record<string, unknown> = {
      stats: {
        newLeads: newLeadsResult,
        callsToday: callsTodayResult,
        conversionsToday: conversionsResult,
        pendingFollowUps: pendingFollowUpsResult,
      },
      hotLeads: hotLeadsResult,
      followUps: followUpsResult.map((fu) => ({
        id: fu.id,
        dueDatetime: fu.dueDatetime.toISOString(),
        priority: fu.priority,
        status: fu.status,
        leadFirstName: fu.lead.firstName,
        leadLastName: fu.lead.lastName,
        leadPhone: fu.lead.phone,
        reason: null,
      })),
    };

    // Admin / Super Admin: add rep performance
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const reps = await db.user.findMany({
        where: { role: 'SALES_REP', isActive: true },
        select: { id: true, name: true, email: true },
      });

      const repPerformance = await Promise.all(
        reps.map(async (rep) => {
          const callsMade = await db.call.count({
            where: {
              repId: rep.id,
              callTimestamp: { gte: today, lte: endOfDay },
            },
          });
          const callsAnswered = await db.call.count({
            where: {
              repId: rep.id,
              callTimestamp: { gte: today, lte: endOfDay },
              outcome: 'ANSWERED',
            },
          });
          const conversions = await db.lead.count({
            where: {
              assignedRepId: rep.id,
              status: 'BOOKED',
              updatedAt: { gte: today, lte: endOfDay },
            },
          });

          return {
            id: rep.id,
            name: rep.name,
            email: rep.email,
            callsMade,
            callsAnswered,
            conversions,
            avgResponseTime: '--',
          };
        }),
      );

      response.repPerformance = repPerformance;

      // Escalations count
      const escalations = await db.followUp.count({
        where: { status: 'ESCALATED' },
      });
      response.escalations = escalations;
    }

    // Super Admin: add system health data
    if (role === 'SUPER_ADMIN') {
      // Channel statuses — always show all three channels from DB
      const channels = await db.channelConnection.findMany({
        select: { channel: true, status: true },
      });

      const channelNames: Record<string, string> = {
        FACEBOOK: 'Facebook',
        INSTAGRAM: 'Instagram',
        WHATSAPP: 'WhatsApp',
      };

      const channelMap = new Map(channels.map((ch) => [ch.channel, ch.status]));

      response.channelStatuses = ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP'].map((ch) => ({
        channel: channelNames[ch] ?? ch,
        status: channelMap.get(ch) ?? 'DISCONNECTED',
      }));

      // Lead source breakdown
      const leadSourceGroups = await db.lead.groupBy({
        by: ['source'],
        _count: { id: true },
      });

      const sourceNames: Record<string, string> = {
        META_AD: 'Meta Ads',
        WHATSAPP: 'WhatsApp',
        INSTAGRAM: 'Instagram',
        FACEBOOK: 'Facebook',
        WEBSITE: 'Website',
        WALK_IN: 'Walk-In',
        REFERRAL: 'Referral',
        MANUAL_IMPORT: 'Manual Import',
      };

      response.leadSourceBreakdown = leadSourceGroups.map((g) => ({
        source: sourceNames[g.source] ?? g.source,
        count: g._count.id,
      }));

      // AI Agent statuses — read from centralized definitions
      try {
        const { AI_AGENT_DEFINITIONS } = await import('@/lib/ai-agent');
        response.aiAgentStatuses = AI_AGENT_DEFINITIONS.map((agent: { id: number; name: string; defaultEnabled: boolean }) => ({
          id: agent.id,
          name: agent.name,
          status: agent.defaultEnabled ? 'ACTIVE' : 'INACTIVE',
        }));
      } catch {
        // Fallback if ai-agent module not yet created
        response.aiAgentStatuses = [
          { id: 1, name: 'Lead Scoring Engine', status: 'ACTIVE' },
          { id: 2, name: 'Customer Bot', status: 'ACTIVE' },
          { id: 3, name: 'Call Monitor', status: 'ACTIVE' },
          { id: 4, name: 'Follow-Up Agent', status: 'ACTIVE' },
          { id: 5, name: 'Reporting Agent', status: 'ACTIVE' },
          { id: 6, name: 'Data Quality Agent', status: 'ACTIVE' },
        ];
      }

      // Active memberships
      const activeMemberships = await db.membership.count({
        where: { status: 'ACTIVE' },
      });
      response.activeMemberships = activeMemberships;
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 },
    );
  }
}
