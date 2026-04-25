// ═══════════════════════════════════════════════════════════════
// SP RWP CRM — AI Learning Engine
// ═══════════════════════════════════════════════════════════════
// Makes the AI chat system smarter over time by:
// 1. Recording every AI conversation with outcomes
// 2. Detecting recurring questions not in FAQ → suggests new FAQ entries
// 3. Tracking which AI responses led to positive outcomes (conversions)
// 4. Learning from rep corrections when they override AI responses
// 5. Building a dynamic knowledge base from approved learnings
// 6. Feeding learned context back into future AI system prompts
// ═══════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import { matchFAQ, detectLanguage, callLLM, parseJSONResponse } from '@/lib/ai-agent';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

export type FeedbackType = 'positive' | 'negative' | 'neutral';
export type ResponseSource = 'faq_match' | 'llm' | 'handoff';
export type LearningType =
  | 'FAQ_CANDIDATE'
  | 'RESPONSE_FEEDBACK'
  | 'PATTERN_DISCOVERED'
  | 'CONVERSATION_OUTCOME'
  | 'KNOWLEDGE_UPDATE';
export type LearningCategory =
  | 'question_answer'
  | 'objection_handling'
  | 'pricing_response'
  | 'facility_info'
  | 'booking_flow'
  | 'sentiment_pattern'
  | 'conversion_strategy';

export interface RecordConversationInput {
  leadId: string;
  channel: string;
  customerMessage: string;
  aiResponse: string;
  agentId: number;
  responseSource: ResponseSource;
  language: string;
  leadStatus: string;
  leadTemperature: string;
}

export interface SubmitFeedbackInput {
  learningId: string;
  feedback: FeedbackType;
  reviewedById: string;
  notes?: string;
}

export interface RecordRepOverrideInput {
  leadId: string;
  channel: string;
  originalAIMessage: string;
  repMessage: string;
  repId: string;
  agentId: number;
}

export interface FAQCandidate {
  id: string;
  question: string;
  suggestedAnswer: string;
  frequency: number;
  language: string;
  confidence: number;
}

export interface DiscoveredPattern {
  id: string;
  type: string;
  description: string;
  dataPoints: number;
  confidence: number;
}

export interface LearningStats {
  totalConversations: number;
  faqMatchRate: number;
  llmRate: number;
  handoffRate: number;
  totalLearnings: number;
  approvedLearnings: number;
  pendingReview: number;
  topCategories: Array<{ category: string; count: number }>;
  positiveFeedbackRate: number;
  conversationsThisWeek: number;
  uniquePatternsDiscovered: number;
}

export interface SmartResponseResult {
  suggestedResponse: string;
  confidence: number;
  basedOn: 'faq' | 'learning' | 'llm' | 'combined';
  learningIds: string[];
}

// ──────────────────────────────────────
// In-Memory Cache (5-minute TTL)
// ──────────────────────────────────────

let learningContextCache: {
  data: string;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ──────────────────────────────────────
// Utility: Fuzzy Similarity
// ──────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function cosineSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const allWords = new Set([...setA, ...setB]);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const word of allWords) {
    const countA = a.filter((w) => w === word).length;
    const countB = b.filter((w) => w === word).length;
    dotProduct += countA * countB;
    magA += countA * countA;
    magB += countB * countB;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dotProduct / denom;
}

function textSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  const jaccard = jaccardSimilarity(tokensA, tokensB);
  const cosine = cosineSimilarity(tokensA, tokensB);
  return (jaccard + cosine) / 2;
}

// ──────────────────────────────────────
// Utility: Categorize Message
// ──────────────────────────────────────

function categorizeMessage(input: string, output: string): LearningCategory {
  const combined = `${input} ${output}`.toLowerCase();

  if (/pric|cost|fee|rate|budget|₨|rs\.?|rupee|paisa|qeemat|kitna/i.test(combined)) {
    return 'pricing_response';
  }
  if (/book|tour|visit|schedule|appointment|moujood|dekhna/i.test(combined)) {
    return 'booking_flow';
  }
  if (/facilit|gym|pool|cricket|tennis|football|squash|jogging|khel/i.test(combined)) {
    return 'facility_info';
  }
  if (/expensive|too much|not afford|mahenga|behtar rate|cheaper|objection/i.test(combined)) {
    return 'objection_handling';
  }
  if (/happy|great|love|awesome|perfect|achha|bohat|nice|thank/i.test(combined)) {
    return 'sentiment_pattern';
  }
  if (/convert|booked|joined|member|signed|deal|close/i.test(combined)) {
    return 'conversion_strategy';
  }
  return 'question_answer';
}

// ──────────────────────────────────────
// 1. Record AI Conversation
// ──────────────────────────────────────

export async function recordAIConversation(data: RecordConversationInput): Promise<void> {
  try {
    const {
      leadId,
      channel,
      customerMessage,
      aiResponse,
      agentId,
      responseSource,
      language,
      leadStatus,
      leadTemperature,
    } = data;

    const category = categorizeMessage(customerMessage, aiResponse);

    // Check if a similar input pattern already exists (within 70% similarity)
    const existingLearnings = await db.aILearning.findMany({
      where: {
        type: 'CONVERSATION_OUTCOME',
        channel,
        language,
      },
      take: 50,
      orderBy: { frequency: 'desc' },
    });

    let matched: typeof existingLearnings[number] | null = null;
    for (const existing of existingLearnings) {
      if (textSimilarity(customerMessage, existing.input) >= 0.7) {
        matched = existing;
        break;
      }
    }

    if (matched) {
      // Increment frequency of existing pattern
      await db.aILearning.update({
        where: { id: matched.id },
        data: {
          frequency: { increment: 1 },
          output: aiResponse, // Update with latest response
          confidence: Math.min(1, matched.confidence + 0.05),
          updatedAt: new Date(),
        },
      });
      console.log(`[Learning] Incremented frequency for existing pattern: "${customerMessage.substring(0, 50)}" (freq: ${matched.frequency + 1})`);
    } else {
      // Create new learning record
      const context = JSON.stringify({
        leadStatus,
        leadTemperature,
        responseSource,
      });

      await db.aILearning.create({
        data: {
          type: 'CONVERSATION_OUTCOME',
          category,
          input: customerMessage,
          output: aiResponse,
          context,
          feedback: 'neutral',
          confidence: responseSource === 'faq_match' ? 0.8 : 0.5,
          frequency: 1,
          sourceAgent: agentId,
          leadId,
          channel,
          language,
          status: responseSource === 'faq_match' ? 'AUTO_APPROVED' : 'PENDING_REVIEW',
        },
      });
      console.log(`[Learning] Recorded new conversation: "${customerMessage.substring(0, 50)}" (${language}, ${channel})`);
    }
  } catch (error) {
    console.error('[Learning] Failed to record AI conversation:', error);
    // NEVER let learning errors crash the main app
  }
}

// ──────────────────────────────────────
// 2. Submit Feedback
// ──────────────────────────────────────

export async function submitResponseFeedback(data: SubmitFeedbackInput): Promise<void> {
  try {
    const { learningId, feedback, reviewedById, notes } = data;

    const learning = await db.aILearning.findUnique({
      where: { id: learningId },
    });

    if (!learning) {
      console.warn(`[Learning] Feedback submitted for non-existent learning: ${learningId}`);
      return;
    }

    // Determine new status based on feedback + frequency
    let newStatus = learning.status;
    if (feedback === 'positive' && learning.frequency >= 3) {
      newStatus = 'AUTO_APPROVED';
    } else if (feedback === 'negative' && learning.frequency >= 3) {
      newStatus = 'PENDING_REVIEW'; // Ensure it stays in review
    }

    await db.aILearning.update({
      where: { id: learningId },
      data: {
        feedback,
        status: newStatus,
        reviewedById,
        reviewedAt: new Date(),
        reviewNotes: notes ?? learning.reviewNotes,
        // Update confidence based on feedback
        confidence:
          feedback === 'positive'
            ? Math.min(1, learning.confidence + 0.1)
            : feedback === 'negative'
              ? Math.max(0, learning.confidence - 0.15)
              : learning.confidence,
      },
    });

    console.log(`[Learning] Feedback "${feedback}" submitted for learning ${learningId} (new status: ${newStatus})`);

    // Invalidate cache since learnings changed
    learningContextCache = null;
  } catch (error) {
    console.error('[Learning] Failed to submit feedback:', error);
  }
}

// ──────────────────────────────────────
// 3. Record Rep Override
// ──────────────────────────────────────

export async function recordRepOverride(data: RecordRepOverrideInput): Promise<void> {
  try {
    const { leadId, channel, originalAIMessage, repMessage, repId, agentId } = data;

    const category = categorizeMessage(originalAIMessage, repMessage);
    const lang = detectLanguage(repMessage);

    const context = JSON.stringify({
      leadId,
      channel,
      overriddenBy: repId,
    });

    await db.aILearning.create({
      data: {
        type: 'RESPONSE_FEEDBACK',
        category,
        input: originalAIMessage,
        output: repMessage,
        context,
        feedback: 'neutral', // Will be determined later by outcome
        confidence: 0.6, // Rep responses start with moderate confidence
        frequency: 1,
        sourceAgent: agentId,
        leadId,
        channel,
        language: lang,
        status: 'PENDING_REVIEW',
      },
    });

    console.log(`[Learning] Recorded rep override: "${originalAIMessage.substring(0, 40)}" → "${repMessage.substring(0, 40)}"`);

    // Invalidate cache
    learningContextCache = null;
  } catch (error) {
    console.error('[Learning] Failed to record rep override:', error);
  }
}

// ──────────────────────────────────────
// 4. Detect FAQ Candidates
// ──────────────────────────────────────

export async function detectFAQCandidates(): Promise<FAQCandidate[]> {
  try {
    // Get all LLM-based conversations (not FAQ-matched, not handoffs)
    const llmConversations = await db.aILearning.findMany({
      where: {
        type: 'CONVERSATION_OUTCOME',
        status: { in: ['PENDING_REVIEW', 'AUTO_APPROVED'] },
      },
      orderBy: { frequency: 'desc' },
      take: 200,
    });

    if (llmConversations.length === 0) {
      console.log('[Learning] No LLM conversations to analyze for FAQ candidates');
      return [];
    }

    // Group similar questions
    const groups: Map<string, { items: typeof llmConversations; bestAnswer: string; frequency: number }> = new Map();

    for (const conv of llmConversations) {
      let matched = false;

      for (const [key, group] of groups) {
        if (textSimilarity(conv.input, key) >= 0.7) {
          group.items.push(conv);
          group.frequency += conv.frequency;
          // Keep the most common response
          if (conv.frequency > group.items[0]?.frequency) {
            group.bestAnswer = conv.output;
          }
          matched = true;
          break;
        }
      }

      if (!matched) {
        groups.set(conv.input, {
          items: [conv],
          bestAnswer: conv.output,
          frequency: conv.frequency,
        });
      }
    }

    const candidates: FAQCandidate[] = [];

    for (const [question, group] of groups) {
      // Only suggest groups with frequency >= 3
      if (group.frequency >= 3) {
        // Check if this is already in the static FAQ
        const existingFAQ = matchFAQ(question);
        if (existingFAQ) continue;

        const confidence = Math.min(1, group.frequency / 10);
        const language = group.items[0]?.language ?? detectLanguage(question);

        // Create or update FAQ_CANDIDATE record
        let candidate = await db.aILearning.findFirst({
          where: {
            type: 'FAQ_CANDIDATE',
            input: question,
          },
        });

        if (!candidate) {
          candidate = await db.aILearning.create({
            data: {
              type: 'FAQ_CANDIDATE',
              category: 'question_answer',
              input: question,
              output: group.bestAnswer,
              feedback: 'neutral',
              confidence,
              frequency: group.frequency,
              channel: group.items[0]?.channel,
              language,
              status: 'PENDING_REVIEW',
            },
          });
        } else {
          await db.aILearning.update({
            where: { id: candidate.id },
            data: {
              output: group.bestAnswer,
              frequency: group.frequency,
              confidence,
              updatedAt: new Date(),
            },
          });
        }

        candidates.push({
          id: candidate.id,
          question,
          suggestedAnswer: group.bestAnswer,
          frequency: group.frequency,
          language,
          confidence,
        });
      }
    }

    console.log(`[Learning] Found ${candidates.length} FAQ candidates`);
    return candidates;
  } catch (error) {
    console.error('[Learning] Failed to detect FAQ candidates:', error);
    return [];
  }
}

// ──────────────────────────────────────
// 5. Discover Patterns
// ──────────────────────────────────────

export async function discoverPatterns(): Promise<DiscoveredPattern[]> {
  try {
    const patterns: DiscoveredPattern[] = [];

    // ── Pattern 1: Conversations that led to BOOKED status ──
    const bookedLearnings = await db.aILearning.findMany({
      where: {
        type: 'CONVERSATION_OUTCOME',
        feedback: 'positive',
        leadId: { not: null },
      },
      take: 100,
    });

    // Group positive feedback by keywords
    const positiveKeywords = new Map<string, number>();
    for (const learning of bookedLearnings) {
      const tokens = tokenize(learning.input);
      for (const token of tokens) {
        positiveKeywords.set(token, (positiveKeywords.get(token) ?? 0) + 1);
      }
    }

    // Find high-frequency positive keywords (appear in 5+ conversations)
    const topPositiveKeywords = Array.from(positiveKeywords.entries())
      .filter(([, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topPositiveKeywords.length > 0) {
      const description = `Keywords associated with positive outcomes: ${topPositiveKeywords.map(([kw, count]) => `"${kw}" (${count}x)`).join(', ')}`;

      const pattern = await db.aILearning.create({
        data: {
          type: 'PATTERN_DISCOVERED',
          category: 'conversion_strategy',
          input: 'positive_outcome_keywords',
          output: JSON.stringify(topPositiveKeywords),
          context: description,
          feedback: 'positive',
          confidence: Math.min(1, topPositiveKeywords[0][1] / 20),
          frequency: topPositiveKeywords.reduce((sum, [, count]) => sum + count, 0),
          status: 'PENDING_REVIEW',
        },
      });

      patterns.push({
        id: pattern.id,
        type: 'positive_conversion_keywords',
        description,
        dataPoints: topPositiveKeywords.reduce((sum, [, count]) => sum + count, 0),
        confidence: pattern.confidence,
      });
    }

    // ── Pattern 2: Negative / Lost patterns ──
    const lostLearnings = await db.aILearning.findMany({
      where: {
        type: 'CONVERSATION_OUTCOME',
        feedback: 'negative',
      },
      take: 100,
    });

    const negativeKeywords = new Map<string, number>();
    for (const learning of lostLearnings) {
      const tokens = tokenize(learning.input);
      for (const token of tokens) {
        negativeKeywords.set(token, (negativeKeywords.get(token) ?? 0) + 1);
      }
    }

    const topNegativeKeywords = Array.from(negativeKeywords.entries())
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topNegativeKeywords.length > 0) {
      const description = `Keywords associated with negative outcomes/loss: ${topNegativeKeywords.map(([kw, count]) => `"${kw}" (${count}x)`).join(', ')}`;

      const pattern = await db.aILearning.create({
        data: {
          type: 'PATTERN_DISCOVERED',
          category: 'sentiment_pattern',
          input: 'negative_outcome_keywords',
          output: JSON.stringify(topNegativeKeywords),
          context: description,
          feedback: 'negative',
          confidence: Math.min(1, topNegativeKeywords[0][1] / 15),
          frequency: topNegativeKeywords.reduce((sum, [, count]) => sum + count, 0),
          status: 'PENDING_REVIEW',
        },
      });

      patterns.push({
        id: pattern.id,
        type: 'negative_outcome_keywords',
        description,
        dataPoints: topNegativeKeywords.reduce((sum, [, count]) => sum + count, 0),
        confidence: pattern.confidence,
      });
    }

    // ── Pattern 3: Best channel performance ──
    const channelStats = await db.aILearning.groupBy({
      by: ['channel'],
      where: {
        type: 'CONVERSATION_OUTCOME',
        channel: { not: null },
      },
      _count: { id: true },
      _avg: { confidence: true },
      orderBy: { _count: { id: 'desc' } },
    });

    if (channelStats.length > 1) {
      const bestChannel = channelStats.reduce((best, curr) =>
        (curr._avg.confidence ?? 0) > (best._avg.confidence ?? 0) ? curr : best
      );

      const description = `Best performing channel: ${bestChannel.channel} (${bestChannel._count.id} conversations, avg confidence: ${(bestChannel._avg.confidence ?? 0).toFixed(2)})`;

      const pattern = await db.aILearning.create({
        data: {
          type: 'PATTERN_DISCOVERED',
          category: 'conversion_strategy',
          input: 'best_channel',
          output: bestChannel.channel ?? 'unknown',
          context: JSON.stringify(channelStats),
          feedback: 'positive',
          confidence: bestChannel._avg.confidence ?? 0.5,
          frequency: bestChannel._count.id,
          status: 'PENDING_REVIEW',
        },
      });

      patterns.push({
        id: pattern.id,
        type: 'best_channel_performance',
        description,
        dataPoints: bestChannel._count.id,
        confidence: pattern.confidence,
      });
    }

    // ── Pattern 4: Objection handling effectiveness ──
    const objectionLearnings = await db.aILearning.findMany({
      where: {
        type: 'RESPONSE_FEEDBACK',
        category: 'objection_handling',
      },
      take: 50,
    });

    if (objectionLearnings.length >= 3) {
      const description = `Rep overrides for objection handling: ${objectionLearnings.length} patterns learned. Most common objection pattern: "${objectionLearnings[0]?.input.substring(0, 80)}"`;

      const pattern = await db.aILearning.create({
        data: {
          type: 'PATTERN_DISCOVERED',
          category: 'objection_handling',
          input: 'objection_handling_patterns',
          output: objectionLearnings.slice(0, 5).map((l) => l.output).join(' | '),
          context: description,
          feedback: 'neutral',
          confidence: Math.min(1, objectionLearnings.length / 10),
          frequency: objectionLearnings.length,
          status: 'PENDING_REVIEW',
        },
      });

      patterns.push({
        id: pattern.id,
        type: 'objection_handling',
        description,
        dataPoints: objectionLearnings.length,
        confidence: pattern.confidence,
      });
    }

    // ── Pattern 5: Language distribution insights ──
    const langStats = await db.aILearning.groupBy({
      by: ['language'],
      where: {
        type: 'CONVERSATION_OUTCOME',
        language: { not: null },
      },
      _count: { id: true },
      _avg: { confidence: true },
    });

    if (langStats.length > 0) {
      const topLang = langStats.reduce((best, curr) =>
        curr._count.id > best._count.id ? curr : best
      );

      const description = `Primary language: ${topLang.language} (${topLang._count.id} conversations). Distribution: ${langStats.map((s) => `${s.language}: ${s._count.id}`).join(', ')}`;

      const pattern = await db.aILearning.create({
        data: {
          type: 'PATTERN_DISCOVERED',
          category: 'sentiment_pattern',
          input: 'language_distribution',
          output: JSON.stringify(langStats),
          context: description,
          feedback: 'neutral',
          confidence: 0.7,
          frequency: langStats.reduce((sum, s) => sum + s._count.id, 0),
          status: 'PENDING_REVIEW',
        },
      });

      patterns.push({
        id: pattern.id,
        type: 'language_distribution',
        description,
        dataPoints: langStats.reduce((sum, s) => sum + s._count.id, 0),
        confidence: pattern.confidence,
      });
    }

    console.log(`[Learning] Discovered ${patterns.length} new patterns`);
    return patterns;
  } catch (error) {
    console.error('[Learning] Failed to discover patterns:', error);
    return [];
  }
}

// ──────────────────────────────────────
// 6. Get Learning Context for Prompt
// ──────────────────────────────────────

export async function getLearningContext(options?: {
  channel?: string;
  language?: string;
  limit?: number;
}): Promise<string> {
  try {
    // Check cache first
    if (learningContextCache && Date.now() - learningContextCache.timestamp < CACHE_TTL_MS) {
      return learningContextCache.data;
    }

    const limit = options?.limit ?? 20;

    // Fetch approved and auto-approved learnings
    const whereClause: Record<string, unknown> = {
      status: { in: ['APPROVED', 'AUTO_APPROVED'] },
    };

    if (options?.channel) {
      whereClause.channel = options.channel;
    }
    if (options?.language) {
      whereClause.language = options.language;
    }

    const approvedLearnings = await db.aILearning.findMany({
      where: whereClause,
      orderBy: [{ confidence: 'desc' }, { frequency: 'desc' }],
      take: limit,
    });

    if (approvedLearnings.length === 0) {
      return '';
    }

    const lines: string[] = ['LEARNED KNOWLEDGE (from past conversations):'];

    // Group by category for better context
    const faqLearnings = approvedLearnings.filter(
      (l) => l.type === 'FAQ_CANDIDATE' || l.type === 'KNOWLEDGE_UPDATE'
    );
    const patternLearnings = approvedLearnings.filter(
      (l) => l.type === 'PATTERN_DISCOVERED'
    );
    const responseFeedbacks = approvedLearnings.filter(
      (l) => l.type === 'RESPONSE_FEEDBACK'
    );

    // FAQ / Knowledge entries
    if (faqLearnings.length > 0) {
      for (const learning of faqLearnings.slice(0, 8)) {
        lines.push(`- Q: "${learning.input.substring(0, 100)}" → A: "${learning.output.substring(0, 200)}"`);
      }
    }

    // Pattern insights
    if (patternLearnings.length > 0) {
      for (const learning of patternLearnings.slice(0, 4)) {
        if (learning.category === 'conversion_strategy') {
          lines.push(`- Conversion Pattern: ${learning.output.substring(0, 200)}`);
        } else if (learning.category === 'sentiment_pattern') {
          lines.push(`- Sentiment Insight: ${learning.output.substring(0, 200)}`);
        } else if (learning.category === 'objection_handling') {
          lines.push(`- Objection: "${learning.input.substring(0, 60)}" → Best response: ${learning.output.substring(0, 200)}`);
        } else {
          lines.push(`- Pattern: ${learning.context ?? learning.output.substring(0, 200)}`);
        }
      }
    }

    // Rep correction learnings
    if (responseFeedbacks.length > 0) {
      for (const learning of responseFeedbacks.slice(0, 3)) {
        lines.push(`- Improved Response: When customer says "${learning.input.substring(0, 60)}", better to say: "${learning.output.substring(0, 200)}"`);
      }
    }

    const result = lines.join('\n');

    // Update cache
    learningContextCache = {
      data: result,
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    console.error('[Learning] Failed to get learning context:', error);
    return '';
  }
}

// ──────────────────────────────────────
// 7. Record Lead Outcome
// ──────────────────────────────────────

export async function recordLeadOutcome(
  leadId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  try {
    // Only act on BOOKED or LOST status changes
    if (newStatus !== 'BOOKED' && newStatus !== 'LOST') {
      return;
    }

    const isPositive = newStatus === 'BOOKED';
    const feedback: FeedbackType = isPositive ? 'positive' : 'negative';

    // Find recent AI conversations for this lead (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentConversations = await db.aILearning.findMany({
      where: {
        leadId,
        type: 'CONVERSATION_OUTCOME',
        createdAt: { gte: sevenDaysAgo },
      },
    });

    if (recentConversations.length === 0) {
      console.log(`[Learning] No recent AI conversations found for lead ${leadId}`);
      return;
    }

    // Update feedback for all recent conversations
    const updatePromises = recentConversations.map((conv) =>
      db.aILearning.update({
        where: { id: conv.id },
        data: {
          feedback,
          confidence: isPositive
            ? Math.min(1, conv.confidence + 0.15)
            : Math.max(0, conv.confidence - 0.2),
          // Auto-approve high-confidence positive learnings
          ...(isPositive && conv.frequency >= 3
            ? { status: 'AUTO_APPROVED' }
            : {}),
          updatedAt: new Date(),
        },
      })
    );

    await Promise.all(updatePromises);

    // Also update any related REPONSE_FEEDBACK records
    const relatedFeedback = await db.aILearning.findMany({
      where: {
        leadId,
        type: 'RESPONSE_FEEDBACK',
        createdAt: { gte: sevenDaysAgo },
      },
    });

    for (const rf of relatedFeedback) {
      await db.aILearning.update({
        where: { id: rf.id },
        data: {
          feedback,
          confidence: isPositive
            ? Math.min(1, rf.confidence + 0.2)
            : Math.max(0, rf.confidence - 0.15),
          ...(isPositive && rf.frequency >= 2
            ? { status: 'AUTO_APPROVED' }
            : {}),
          updatedAt: new Date(),
        },
      });
    }

    // Invalidate cache
    learningContextCache = null;

    console.log(
      `[Learning] Recorded outcome "${newStatus}" for lead ${leadId} — updated ${recentConversations.length + relatedFeedback.length} learning records`
    );
  } catch (error) {
    console.error('[Learning] Failed to record lead outcome:', error);
  }
}

// ──────────────────────────────────────
// 8. Auto-Approve High-Confidence Learnings
// ──────────────────────────────────────

export async function autoApproveLearnings(): Promise<number> {
  try {
    // Find PENDING_REVIEW learnings that meet auto-approve criteria:
    // - frequency >= 5
    // - positive feedback ratio >= 0.7
    const pendingLearnings = await db.aILearning.findMany({
      where: {
        status: 'PENDING_REVIEW',
        frequency: { gte: 5 },
        feedback: 'positive',
      },
    });

    let approvedCount = 0;

    for (const learning of pendingLearnings) {
      // Additional check: positive feedback ratio in similar learnings
      const similarCount = await db.aILearning.count({
        where: {
          input: learning.input,
          feedback: 'positive',
        },
      });

      const totalCount = await db.aILearning.count({
        where: {
          input: learning.input,
        },
      });

      const positiveRatio = totalCount > 0 ? similarCount / totalCount : 0;

      if (positiveRatio >= 0.7 || learning.feedback === 'positive') {
        await db.aILearning.update({
          where: { id: learning.id },
          data: {
            status: 'AUTO_APPROVED',
            deployedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        approvedCount++;
      }
    }

    if (approvedCount > 0) {
      // Invalidate cache since approved learnings changed
      learningContextCache = null;
    }

    console.log(`[Learning] Auto-approved ${approvedCount} high-confidence learnings`);
    return approvedCount;
  } catch (error) {
    console.error('[Learning] Failed to auto-approve learnings:', error);
    return 0;
  }
}

// ──────────────────────────────────────
// 9. Get Learning Stats
// ──────────────────────────────────────

export async function getLearningStats(): Promise<LearningStats> {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total conversation outcome learnings
    const totalConversations = await db.aILearning.count({
      where: { type: 'CONVERSATION_OUTCOME' },
    });

    // Response source rates
    const faqMatches = await db.aILearning.count({
      where: {
        type: 'CONVERSATION_OUTCOME',
        status: 'AUTO_APPROVED', // FAQ matches are auto-approved
      },
    });
    const llmResponses = await db.aILearning.count({
      where: {
        type: 'CONVERSATION_OUTCOME',
        status: 'PENDING_REVIEW',
      },
    });
    const handoffs = await db.aILearning.count({
      where: {
        type: 'CONVERSATION_OUTCOME',
        output: { contains: 'connect you' },
      },
    });

    const total = totalConversations || 1; // Avoid division by zero

    // Total learnings overall
    const totalLearnings = await db.aILearning.count();

    // Approved and pending
    const approvedLearnings = await db.aILearning.count({
      where: { status: { in: ['APPROVED', 'AUTO_APPROVED', 'DEPLOYED'] } },
    });
    const pendingReview = await db.aILearning.count({
      where: { status: 'PENDING_REVIEW' },
    });

    // Top categories
    const categoryGroups = await db.aILearning.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 5,
    });

    // Positive feedback rate
    const positiveCount = await db.aILearning.count({
      where: { feedback: 'positive' },
    });
    const feedbackCount = await db.aILearning.count({
      where: { feedback: { in: ['positive', 'negative', 'neutral'] } },
    });

    // Conversations this week
    const conversationsThisWeek = await db.aILearning.count({
      where: {
        type: 'CONVERSATION_OUTCOME',
        createdAt: { gte: weekAgo },
      },
    });

    // Unique patterns discovered
    const uniquePatternsDiscovered = await db.aILearning.count({
      where: {
        type: 'PATTERN_DISCOVERED',
      },
    });

    return {
      totalConversations,
      faqMatchRate: Math.round((faqMatches / total) * 100) / 100,
      llmRate: Math.round((llmResponses / total) * 100) / 100,
      handoffRate: Math.round((handoffs / total) * 100) / 100,
      totalLearnings,
      approvedLearnings,
      pendingReview,
      topCategories: categoryGroups.map((g) => ({
        category: g.category,
        count: g._count.category,
      })),
      positiveFeedbackRate:
        feedbackCount > 0
          ? Math.round((positiveCount / feedbackCount) * 100) / 100
          : 0,
      conversationsThisWeek,
      uniquePatternsDiscovered,
    };
  } catch (error) {
    console.error('[Learning] Failed to get learning stats:', error);
    return {
      totalConversations: 0,
      faqMatchRate: 0,
      llmRate: 0,
      handoffRate: 0,
      totalLearnings: 0,
      approvedLearnings: 0,
      pendingReview: 0,
      topCategories: [],
      positiveFeedbackRate: 0,
      conversationsThisWeek: 0,
      uniquePatternsDiscovered: 0,
    };
  }
}

// ──────────────────────────────────────
// 10. Suggest Smart Responses
// ──────────────────────────────────────

export async function suggestSmartResponse(
  customerMessage: string,
  lead: { id: string; status?: string; temperature?: string; channel?: string } | null
): Promise<SmartResponseResult> {
  try {
    const language = detectLanguage(customerMessage);
    const channel = lead?.channel;
    const usedLearningIds: string[] = [];

    // ── Step 1: Check static FAQ ──
    const faqMatch = matchFAQ(customerMessage);
    if (faqMatch) {
      return {
        suggestedResponse: faqMatch.answer,
        confidence: 0.9,
        basedOn: 'faq',
        learningIds: [],
      };
    }

    // ── Step 2: Check approved learnings for similar questions ──
    const whereClause: Record<string, unknown> = {
      status: { in: ['APPROVED', 'AUTO_APPROVED', 'DEPLOYED'] },
      type: { in: ['FAQ_CANDIDATE', 'KNOWLEDGE_UPDATE', 'CONVERSATION_OUTCOME'] },
      confidence: { gte: 0.6 },
    };

    if (channel) {
      whereClause.channel = channel;
    }
    if (language) {
      whereClause.language = language;
    }

    const approvedLearnings = await db.aILearning.findMany({
      where: whereClause,
      orderBy: [{ confidence: 'desc' }, { frequency: 'desc' }],
      take: 30,
    });

    // Find similar questions using fuzzy matching
    let bestMatch: { learning: typeof approvedLearnings[number]; similarity: number } | null = null;

    for (const learning of approvedLearnings) {
      const similarity = textSimilarity(customerMessage, learning.input);
      if (similarity >= 0.65 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { learning, similarity };
      }
    }

    if (bestMatch && bestMatch.similarity >= 0.65) {
      usedLearningIds.push(bestMatch.learning.id);

      // If high confidence, use the learned response directly
      if (bestMatch.learning.confidence >= 0.8 && bestMatch.similarity >= 0.8) {
        return {
          suggestedResponse: bestMatch.learning.output,
          confidence: bestMatch.learning.confidence,
          basedOn: 'learning',
          learningIds: usedLearningIds,
        };
      }

      // If moderate confidence, combine learning with LLM
      if (bestMatch.learning.confidence >= 0.6) {
        try {
          const learningContext = await getLearningContext({ channel, language, limit: 10 });
          const systemPrompt = `You are the AI Customer Bot for Sports Pavilion Rawalpindi.

BUSINESS INFO:
- Location: Sports Pavilion, Rawalpindi, Pakistan
- Timings: Mon-Sat 6:00 AM - 11:00 PM, Sunday 7:00 AM - 10:00 PM
- Facilities: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, Jogging track
- Memberships: Monthly (₨5,000-8,000), Bi-Annual (₨25,000-40,000), Annual (₨45,000-70,000)
- Day passes: ₨500/person, ₨800/family of 4
- Corporate packages available

${learningContext}

RULES:
1. Reply in ${language}
2. Use the learned knowledge above to inform your response
3. Be polite, professional, and helpful
4. Keep response concise

RESPOND ONLY WITH JSON: {"message": "<your reply>", "handoffNeeded": <boolean>}`;

          const prompt = `Customer message: ${customerMessage}
${lead ? `Lead status: ${lead.status ?? 'NEW'}, Temperature: ${lead.temperature ?? 'COLD'}` : ''}

Similar past question: "${bestMatch.learning.input}"
Previous successful response: "${bestMatch.learning.output}"

Please craft a response based on the above context.`;

          const llmResponse = await callLLM(prompt, systemPrompt, {
            temperature: 0.4,
            maxTokens: 400,
          });

          try {
            const parsed = parseJSONResponse(llmResponse) as { message?: string };
            if (parsed.message) {
              return {
                suggestedResponse: parsed.message,
                confidence: (bestMatch.learning.confidence + 0.7) / 2,
                basedOn: 'combined',
                learningIds: usedLearningIds,
              };
            }
          } catch {
            // Fall through to return LLM raw
            return {
              suggestedResponse: llmResponse || bestMatch.learning.output,
              confidence: 0.5,
              basedOn: 'combined',
              learningIds: usedLearningIds,
            };
          }
        } catch {
          // LLM failed, use learned response as fallback
          return {
            suggestedResponse: bestMatch.learning.output,
            confidence: bestMatch.learning.confidence * 0.8,
            basedOn: 'learning',
            learningIds: usedLearningIds,
          };
        }
      }
    }

    // ── Step 3: Fall back to LLM ──
    try {
      const learningContext = await getLearningContext({ channel, language, limit: 10 });
      const systemPrompt = `You are the AI Customer Bot for Sports Pavilion Rawalpindi.

BUSINESS INFO:
- Location: Sports Pavilion, Rawalpindi, Pakistan
- Timings: Mon-Sat 6:00 AM - 11:00 PM, Sunday 7:00 AM - 10:00 PM
- Facilities: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, Jogging track
- Memberships: Monthly (₨5,000-8,000), Bi-Annual (₨25,000-40,000), Annual (₨45,000-70,000)
- Day passes: ₨500/person, ₨800/family of 4

${learningContext}

RULES:
1. Reply in ${language}
2. Be polite, professional, and helpful
3. Keep response concise

RESPOND ONLY WITH JSON: {"message": "<your reply>", "handoffNeeded": <boolean>}`;

      const prompt = `Customer message: ${customerMessage}
${lead ? `Lead status: ${lead.status ?? 'NEW'}, Temperature: ${lead.temperature ?? 'COLD'}` : 'No lead context'}`;

      const llmResponse = await callLLM(prompt, systemPrompt, {
        temperature: 0.5,
        maxTokens: 400,
      });

      try {
        const parsed = parseJSONResponse(llmResponse) as { message?: string };
        return {
          suggestedResponse: parsed.message ?? llmResponse,
          confidence: 0.4,
          basedOn: 'llm',
          learningIds: usedLearningIds,
        };
      } catch {
        return {
          suggestedResponse: llmResponse,
          confidence: 0.3,
          basedOn: 'llm',
          learningIds: usedLearningIds,
        };
      }
    } catch (error) {
      console.error('[Learning] LLM fallback failed:', error);
      return {
        suggestedResponse: 'Thank you for your interest in Sports Pavilion Rawalpindi! How can I help you today?',
        confidence: 0.1,
        basedOn: 'llm',
        learningIds: [],
      };
    }
  } catch (error) {
    console.error('[Learning] Failed to suggest smart response:', error);
    return {
      suggestedResponse: 'Thank you for contacting Sports Pavilion Rawalpindi! Let me connect you with our team.',
      confidence: 0,
      basedOn: 'llm',
      learningIds: [],
    };
  }
}
