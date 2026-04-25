import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';
import { detectFAQCandidates, discoverPatterns, autoApproveLearnings } from '@/lib/ai-learning';

// ──────────────────────────────────────
// POST /api/ai/learning/analyze — Admin+
// Triggers pattern discovery, FAQ candidate detection, and auto-approval
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await requireRole('ADMIN');

    // Run analysis asynchronously but return immediately
    // We'll run them in parallel for speed

    const analysisPromise = (async () => {
      try {
        const [faqCandidates, patterns, autoApproved] = await Promise.all([
          detectFAQCandidates(),
          discoverPatterns(),
          autoApproveLearnings(),
        ]);

        console.log(
          `[Learning] Analysis complete: ${faqCandidates.length} FAQ candidates, ${patterns.length} patterns discovered, ${autoApproved} auto-approved`
        );

        return {
          faqCandidatesFound: faqCandidates.length,
          patternsDiscovered: patterns.length,
          autoApproved: autoApproved,
          faqCandidates: faqCandidates.slice(0, 10), // Return top 10
          patterns: patterns.slice(0, 10), // Return top 10
        };
      } catch (error) {
        console.error('[Learning] Background analysis failed:', error);
        return {
          faqCandidatesFound: 0,
          patternsDiscovered: 0,
          autoApproved: 0,
          faqCandidates: [],
          patterns: [],
          error: 'Analysis completed with errors',
        };
      }
    })();

    // Return immediately with a note that analysis is running
    // For this implementation we await since it's fast enough
    const result = await analysisPromise;

    return NextResponse.json({
      success: true,
      message: 'Analysis complete',
      ...result,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to run analysis';
    console.error('[Learning API] Analyze error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
