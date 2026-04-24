import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';
import { getLearningStats } from '@/lib/ai-learning';
import { db } from '@/lib/db';

// ──────────────────────────────────────
// GET /api/ai/learning/stats — Admin+
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const stats = await getLearningStats();

    // Weekly trend: conversations per day for last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailyTrend = await db.aILearning.groupBy({
      by: ['createdAt'],
      where: {
        type: 'CONVERSATION_OUTCOME',
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    // Aggregate by day
    const dailyMap = new Map<string, number>();
    for (const item of dailyTrend) {
      const day = item.createdAt.toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + item._count.id);
    }

    // Fill in missing days
    const weeklyTrend: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      weeklyTrend.push({
        date: dateStr,
        count: dailyMap.get(dateStr) ?? 0,
      });
    }

    // Learning growth: total learnings over last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentLearnings = await db.aILearning.groupBy({
      by: ['type'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    const learningGrowth = recentLearnings.map((item) => ({
      type: item.type,
      count: item._count.id,
    }));

    return NextResponse.json({
      ...stats,
      weeklyTrend,
      learningGrowth,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to fetch learning stats';
    console.error('[Learning API] Stats error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
