import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// ──────────────────────────────────────
// AI Agent Definitions
// ──────────────────────────────────────

export interface AIAgentConfig {
  id: number;
  name: string;
  description: string;
  capabilities: string[];
  defaultEnabled: boolean;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export const AI_AGENT_DEFINITIONS: AIAgentConfig[] = [
  {
    id: 1,
    name: 'Lead Scoring Engine',
    description: 'Analyzes lead data and conversation history to generate a score (0-100) and temperature (HOT/WARM/COLD) based on buying signals.',
    capabilities: ['Lead qualification', 'Score calculation', 'Temperature assignment', 'Priority ranking'],
    defaultEnabled: true,
    systemPrompt: `You are the Lead Scoring Engine for Sports Pavilion Rawalpindi CRM. Your job is to analyze lead data and calculate a score (0-100) and temperature (HOT/WARM/COLD).

Scoring criteria (additive, clamp to 0-100):
- Mentions specific facility (cricket, gym, pool, tennis, etc.): +15
- States budget range: +20
- Wants family membership: +15
- Shows immediate urgency (today, right now, asap): +25
- Corporate inquiry: +20
- From paid Meta Ad: +10
- Referred by existing member: +15
- Asked about pricing: +10
- Multiple messages sent: +5 per message beyond first
- Weekend/day pass only: -10

Temperature thresholds:
- HOT: score >= 70
- WARM: score 40-69
- COLD: score < 40

Respond ONLY with valid JSON: {"score": <number>, "temperature": "<HOT|WARM|COLD>", "reason": "<brief explanation>"}`,
    temperature: 0.2,
    maxTokens: 200,
  },
  {
    id: 2,
    name: 'Customer Bot',
    description: 'Handles customer-facing conversations on WhatsApp, Instagram, and Facebook. Supports multi-language (Urdu, English, Roman Urdu) and FAQ responses.',
    capabilities: ['Multi-language support', 'FAQ handling', 'Lead qualification', 'Human handoff triggers'],
    defaultEnabled: true,
    systemPrompt: `You are the AI Customer Bot for Sports Pavilion Rawalpindi. You handle customer inquiries on WhatsApp, Instagram, and Facebook.

BUSINESS INFO:
- Location: Sports Pavilion, Rawalpindi, Pakistan
- Timings: Mon-Sat 6:00 AM - 11:00 PM, Sunday 7:00 AM - 10:00 PM
- Facilities: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, Jogging track
- Memberships: Monthly (₨5,000-8,000), Bi-Annual (₨25,000-40,000), Annual (₨45,000-70,000), Family packages available
- Day passes: ₨500 per person, ₨800 family of 4
- Corporate packages available with custom pricing

RULES:
1. Detect the language (English, Urdu script, or Roman Urdu) and reply in the same language.
2. Be polite, professional, and helpful at all times.
3. Answer FAQs accurately using the business info above.
4. If a customer asks about pricing, mention our plans briefly and suggest they visit for a tour.
5. For booking/tours, collect: name, phone number, preferred date/time, and which facilities interest them.
6. NEVER make up pricing or information not provided above.
7. If the customer expresses frustration, complains, wants to negotiate, or asks for a human agent, respond: "I'll connect you with one of our team members who can help you better. Please hold on for a moment." and indicate handoff needed.

RESPOND ONLY with JSON: {"message": "<your reply>", "handoffNeeded": <boolean>, "leadData": {"interestedFacilities": ["<facilities>"], "urgency": "<low|medium|high>", "budgetInterest": "<boolean>"} or null}`,
    temperature: 0.5,
    maxTokens: 500,
  },
  {
    id: 3,
    name: 'Call Monitor',
    description: 'Transcribes and analyzes call recordings to extract customer intent, budget, objections, timeline, sentiment, and coaching opportunities.',
    capabilities: ['Transcription', 'Sentiment analysis', 'Objection extraction', 'Coaching flags'],
    defaultEnabled: true,
    systemPrompt: `You are the Call Monitoring Agent for Sports Pavilion Rawalpindi CRM. You analyze call recordings and transcripts.

Your job is to extract structured data from call text:
1. Customer interest: Which facilities are they interested in?
2. Budget: Any budget mentioned or implied?
3. Objections: What concerns did the customer raise?
4. Timeline: When do they want to start/visit?
5. Sentiment: POSITIVE, NEUTRAL, or NEGATIVE
6. Coaching flags: Did the rep miss opportunities, handle objections poorly, or need improvement?
7. Summary: A 2-3 sentence summary of the call.

RESPOND ONLY with JSON:
{
  "interest": ["<facility1>", "<facility2>"],
  "budget": "<budget mention or null>",
  "objections": ["<objection1>", "<objection2>"],
  "timeline": "<timeline or null>",
  "sentiment": "<POSITIVE|NEUTRAL|NEGATIVE>",
  "coachingFlag": <boolean>,
  "coachingNote": "<improvement suggestion or null>",
  "summary": "<2-3 sentence summary>"
}`,
    temperature: 0.3,
    maxTokens: 400,
  },
  {
    id: 4,
    name: 'Follow-Up Agent',
    description: 'Suggests optimal follow-up timing, messaging, and priority based on lead score, last interaction, and stage in the pipeline.',
    capabilities: ['Follow-up scheduling', 'Message templates', 'Priority assessment', 'Timing optimization'],
    defaultEnabled: true,
    systemPrompt: `You are the Follow-Up Agent for Sports Pavilion Rawalpindi CRM. You analyze lead data and suggest follow-up actions.

Rules:
- HOT leads (score >= 70): Follow up within 1 hour, priority URGENT
- WARM leads (score 40-69): Follow up within 24 hours, priority HIGH
- COLD leads (score < 40): Follow up within 3 days, priority NORMAL
- If last interaction was > 48 hours ago: Increase urgency by one level
- Weekend leads without follow-up by Monday: Escalate
- Provide a personalized message reference based on lead's interests

RESPOND ONLY with JSON:
{
  "suggestedDatetime": "<ISO datetime>",
  "priority": "<URGENT|HIGH|NORMAL|LOW>",
  "message": "<suggested message template>",
  "channel": "<WHATSAPP|PHONE|EMAIL>",
  "reason": "<brief explanation for timing/channel choice>"
}`,
    temperature: 0.4,
    maxTokens: 300,
  },
  {
    id: 5,
    name: 'Reporting Agent',
    description: 'Generates daily, weekly, and monthly performance reports with AI-powered insights and recommendations for sales improvement.',
    capabilities: ['Performance analysis', 'Trend detection', 'Rep comparison', 'Recommendations'],
    defaultEnabled: true,
    systemPrompt: `You are the Reporting Agent for Sports Pavilion Rawalpindi CRM. You analyze performance data and generate insights.

Your reports should include:
1. Key metrics summary (leads, conversions, follow-up rate)
2. Trend analysis (week-over-week changes)
3. Per-rep performance comparison
4. Top performing channels
5. Actionable recommendations (3-5 specific suggestions)
6. Pipeline health assessment

Format your response as clear, professional text suitable for management review.

RESPOND ONLY with JSON:
{
  "summary": "<3-4 sentence executive summary>",
  "metrics": {"totalLeads": <n>, "conversions": <n>, "conversionRate": "<%>", "avgScore": <n>},
  "trends": [{"metric": "<name>", "change": "<direction>", "value": "<%>"}],
  "topReps": [{"name": "<name>", "calls": <n>, "conversions": <n>, "score": <n>}],
  "recommendations": ["<rec1>", "<rec2>", "<rec3>"],
  "pipelineHealth": "<HEALTHY|WARNING|CRITICAL>",
  "detailedReport": "<markdown formatted report text>"
}`,
    temperature: 0.5,
    maxTokens: 800,
  },
  {
    id: 6,
    name: 'Data Quality Agent',
    description: 'Audits CRM data quality, identifies incomplete records, stale follow-ups, and suggests cleanup actions to maintain data integrity.',
    capabilities: ['Data completeness check', 'Stale record detection', 'Duplicate identification', 'Quality scoring', 'Cleanup suggestions'],
    defaultEnabled: true,
    systemPrompt: `You are the Data Quality Agent for Sports Pavilion Rawalpindi CRM. You analyze CRM data for quality issues and provide actionable recommendations.

Your analysis should cover:
1. Lead Data Completeness: Check for missing email, phone, source, budget, assigned rep
2. Stale Follow-Ups: Identify follow-ups overdue by more than 48 hours
3. Lead Temperature Accuracy: Check if HOT leads have recent activity
4. Pipeline Health: Check for leads stuck in same status for too long
5. Call Activity: Identify reps with low call activity
6. Data Consistency: Check for leads with conflicting status/temperature

Respond ONLY with JSON:
{
  "overallScore": <0-100>,
  "issues": [{"severity": "HIGH|MEDIUM|LOW", "category": "<category>", "description": "<issue>", "affected": <count>, "recommendation": "<fix>"}],
  "summary": "<2-3 sentence overall assessment>",
  "quickWins": ["<immediate action 1>", "<action 2>"]
}`,
    temperature: 0.3,
    maxTokens: 600,
  },
];

// ──────────────────────────────────────
// FAQ Knowledge Base
// ──────────────────────────────────────

export const FAQ_KNOWLEDGE_BASE = [
  {
    keywords: ['timings', 'timing', 'hours', 'open', 'close', 'schedule', 'waqt'],
    answer_en: 'We are open Monday to Saturday from 6:00 AM to 11:00 PM, and Sunday from 7:00 AM to 10:00 PM.',
    answer_ur: 'ہم پیر سے ہفتہ صبح 6 بجے سے رات 11 بجے تک، اور اتوار صبح 7 بجے سے رات 10 بجے تک کھلے ہیں۔',
    answer_ro: 'Hum Mon-Sat subah 6 baje se raat 11 baje tak, aur Itwar subah 7 baje se raat 10 baje tak khule hain.',
  },
  {
    keywords: ['location', 'where', 'address', 'kahan', 'kahaan', 'pata'],
    answer_en: 'Sports Pavilion is located in Rawalpindi. Would you like to schedule a visit? We can arrange a free tour of our facilities.',
    answer_ur: 'اسپورٹس پیویلین راولپنڈی میں واقع ہے۔ کیا آپ دورے کا وقت مقرر کرنا چاہیں گے؟ ہم مفت ٹور کا انتظام کر سکتے ہیں۔',
    answer_ro: 'Sports Pavilion Rawalpindi mein mauqood hai. Kya aap visit schedule karna chahein ge? Hum free tour ka intezam kar sakte hain.',
  },
  {
    keywords: ['price', 'pricing', 'cost', 'rate', 'fee', 'paisa', 'paise', 'qeemat'],
    answer_en: 'Our memberships start from ₨5,000/month. Day passes are ₨500/person or ₨800/family of 4. We offer Monthly, Bi-Annual, and Annual plans with family packages. Visit us for a personalized quote!',
    answer_ur: 'ہماری رکنیت ₨5,000/ماہ سے شروع ہوتی ہے۔ ڈے پاس ₨500/فرد یا ₨800/خاندان ہیں۔ مہینہ وار، چھ ماہیے، اور سالانہ پلانز دستیاب ہیں۔',
    answer_ro: 'Hamari membership Rs 5,000/month se shuru hoti hai. Day pass Rs 500/shakhs ya Rs 800/family of 4 hai. Monthly, bi-annual, aur annual plans available hain.',
  },
  {
    keywords: ['facility', 'facilities', 'sports', 'game', 'khel', 'ground'],
    answer_en: 'We offer: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, and a Jogging track. Which facilities interest you?',
    answer_ur: 'ہمارے پاس ہیں: کرکٹ نیٹس، فٹ بال گراؤنڈ، جیم، سوئمنگ پول، ٹینس کورٹس، بسکٹ بال کورٹ، سکواش کورٹس، اور جاگنگ ٹریک۔ کون سے سہولیات آپ کی دلچسپی رکھتی ہیں؟',
    answer_ro: 'Hum offer karte hain: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, aur Jogging track. Kaun si facility aapko pasand hai?',
  },
  {
    keywords: ['book', 'booking', 'tour', 'visit', 'dekhna', 'moujood'],
    answer_en: 'Great! I can help you book a free tour. Please share your name, phone number, and preferred date/time, and I\'ll arrange it for you.',
    answer_ur: 'بہت اچھا! میں آپ کے لیے مفت ٹور بک کر سکتا ہوں۔ براہ کرم اپنا نام، فون نمبر، اور پسندیدہ تاریخ/وقت بتائیں۔',
    answer_ro: 'Bohat acha! Main aap ke liye free tour book kar sakta hoon. Bara karm apna naam, phone number, aur preferred date/time batayein.',
  },
  {
    keywords: ['membership', 'member', 'plan', 'package', 'subscribe'],
    answer_en: 'We have Monthly (₨5,000-8,000), Bi-Annual (₨25,000-40,000), and Annual (₨45,000-70,000) plans. Family packages offer discounts for 3+ members. Corporate packages are also available!',
    answer_ur: 'ہمارے پاس ماہانہ (₨5,000-8,000)، چھ ماہیے (₨25,000-40,000)، اور سالانہ (₨45,000-70,000) پلانز ہیں۔ خاندانی پیکجز میں 3+ اراکین پر رعایت ہے۔',
    answer_ro: 'Hamare paas Monthly (Rs 5,000-8,000), Bi-Annual (Rs 25,000-40,000), aur Annual (Rs 45,000-70,000) plans hain. Family packages mein 3+ members par discount hai.',
  },
];

// ──────────────────────────────────────
// Language Detection Utility
// ──────────────────────────────────────

export type DetectedLanguage = 'english' | 'urdu' | 'roman_urdu';

export function detectLanguage(text: string): DetectedLanguage {
  // Check for Urdu script characters (Unicode range)
  const urduChars = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (urduChars.test(text)) return 'urdu';

  // Roman Urdu detection — common Urdu words written in Latin script
  const romanUrduWords = [
    'hai', 'hain', 'hoon', 'hum', 'tum', 'aap', 'mujhe', 'kya', 'kab', 'kahan',
    'kitna', 'bhii', 'bhi', 'par', 'pe', 'mein', 'men', 'se', 'ka', 'ki', 'ke',
    'nahi', 'nhi', 'haan', 'ji', 'bhai', 'sahib', 'sir', 'yaar', 'acha', 'achha',
    'theek', 'sab', 'lekin', 'agar', 'toh', 'phir', 'abhi', 'kuch', 'bohat', 'bahut',
    'waqt', 'paisa', 'qeemat', 'daeim', 'khana', 'peena', 'jana', 'aana', 'dena',
    'chod', 'chodo', 'ruko', 'sunao', 'bolo', 'samjho', 'wala', 'wali', 'wallay',
  ];

  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  const romanUrduCount = words.filter((w) => romanUrduWords.includes(w)).length;

  if (romanUrduCount >= 2 || (words.length > 0 && romanUrduCount / words.length >= 0.15)) {
    return 'roman_urdu';
  }

  return 'english';
}

// ──────────────────────────────────────
// Lead Scoring Logic
// ──────────────────────────────────────

export interface LeadScoringInput {
  firstName: string;
  lastName: string;
  messageText?: string;
  source?: string;
  leadType?: string;
  interestedFacilities?: string[];
  budgetRange?: string;
  messageCount?: number;
  conversationHistory?: string;
}

export function calculateLeadScore(input: LeadScoringInput): {
  score: number;
  temperature: 'HOT' | 'WARM' | 'COLD';
  factors: { criterion: string; points: number }[];
} {
  let score = 30; // Base score
  const factors: { criterion: string; points: number }[] = [];

  const text = [
    input.messageText,
    input.conversationHistory,
    input.interestedFacilities?.join(' '),
  ].filter(Boolean).join(' ').toLowerCase();

  // Mentions specific facility: +15
  const facilities = ['cricket', 'gym', 'pool', 'swimming', 'tennis', 'football', 'basketball', 'squash', 'jogging'];
  if (facilities.some((f) => text.includes(f))) {
    score += 15;
    factors.push({ criterion: 'Mentions specific facility', points: 15 });
  }

  // States budget: +20
  if (input.budgetRange || text.match(/budget|price|rate|cost|afford|₨|rs\.?|rupee/)) {
    score += 20;
    factors.push({ criterion: 'States budget/pricing interest', points: 20 });
  }

  // Family membership: +15
  if (input.leadType === 'CORPORATE' || text.match(/family|kids|children|wife|spouse/)) {
    score += 15;
    factors.push({ criterion: 'Family/corporate interest', points: 15 });
  }

  // Immediate urgency: +25
  if (text.match(/today|right now|asap|urgent|immediate|jab|abhi|foran/)) {
    score += 25;
    factors.push({ criterion: 'Shows immediate urgency', points: 25 });
  }

  // Corporate inquiry: +20
  if (input.leadType === 'CORPORATE' || text.match(/corporate|company|office|organization/)) {
    if (!factors.some((f) => f.criterion === 'Family/corporate interest')) {
      score += 20;
      factors.push({ criterion: 'Corporate inquiry', points: 20 });
    }
  }

  // From paid Meta Ad: +10
  if (input.source === 'META_AD') {
    score += 10;
    factors.push({ criterion: 'From paid Meta Ad', points: 10 });
  }

  // Referred: +15
  if (input.source === 'REFERRAL' || text.match(/referred|friend|recommend/)) {
    score += 15;
    factors.push({ criterion: 'Referred by someone', points: 15 });
  }

  // Asked about pricing: +10
  if (text.match(/how much|price|pricing|rate|fee|charge|kitna/)) {
    if (!factors.some((f) => f.criterion === 'States budget/pricing interest')) {
      score += 10;
      factors.push({ criterion: 'Asked about pricing', points: 10 });
    }
  }

  // Multiple messages: +5 per msg beyond first
  if ((input.messageCount ?? 1) > 1) {
    const msgPoints = Math.min(20, (input.messageCount! - 1) * 5);
    score += msgPoints;
    factors.push({ criterion: `Multiple messages (${input.messageCount})`, points: msgPoints });
  }

  // Weekend/day pass only: -10
  if (text.match(/day pass|weekend only|weekend pass|just visiting/)) {
    score -= 10;
    factors.push({ criterion: 'Weekend/day pass only', points: -10 });
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  const temperature: 'HOT' | 'WARM' | 'COLD' =
    score >= 70 ? 'HOT' : score >= 40 ? 'WARM' : 'COLD';

  return { score, temperature, factors };
}

// ──────────────────────────────────────
// ZAI SDK Helper (Enhanced with Learning Context)
// Includes retry with exponential backoff for cold-start resilience
// ──────────────────────────────────────

// AI warmup: keeps the backend function warm to reduce cold-start errors
let lastWarmupTime = 0;
const WARMUP_INTERVAL_MS = 4 * 60 * 1000; // every 4 minutes

async function warmupAI(): Promise<void> {
  const now = Date.now();
  if (now - lastWarmupTime > WARMUP_INTERVAL_MS) {
    try {
      const zai = await ZAI.create();
      await zai.chat.completions.create({
        model: 'glm-4-plus',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });
      lastWarmupTime = now;
      console.log('[AI Agent] Warmup ping successful');
    } catch (err) {
      console.warn('[AI Agent] Warmup ping failed (non-blocking):', err);
    }
  }
}

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2 seconds
const MAX_DELAY_MS = 15000; // 15 seconds cap

function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('PreconditionFailed') ||
    msg.includes('pending state') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('429') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('socket hang up')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLLM(
  prompt: string,
  systemPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    learningContext?: string;
  }
): Promise<string> {
  // Inject learning context into system prompt if provided
  let enhancedSystemPrompt = systemPrompt;
  if (options?.learningContext) {
    enhancedSystemPrompt = `${systemPrompt}\n\n${options.learningContext}`;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Attempt warmup before first try
      if (attempt === 0) await warmupAI();

      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        model: 'glm-4-plus',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 500,
      });

      return response.choices[0]?.message?.content ?? '';
    } catch (error) {
      const canRetry = isRetryableError(error);
      const hasRetriesLeft = attempt < MAX_RETRIES;

      if (canRetry && hasRetriesLeft) {
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
        console.warn(
          `[AI Agent] Retryable error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`,
          error instanceof Error ? error.message : error
        );
        await sleep(delay);
        continue;
      }

      console.error('[AI Agent] LLM call failed after all retries:', error);
      throw new Error('AI service unavailable. Please try again later.');
    }
  }

  throw new Error('AI service unavailable. Please try again later.');
}

export function parseJSONResponse(text: string): Record<string, unknown> {
  // Try to extract JSON from the response (might be wrapped in markdown)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch?.[1] ?? text;

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

// ──────────────────────────────────────
// FAQ Matching Utility
// ──────────────────────────────────────

export function matchFAQ(message: string): { answer: string; language: DetectedLanguage } | null {
  const lang = detectLanguage(message);
  const normalized = message.toLowerCase();

  for (const faq of FAQ_KNOWLEDGE_BASE) {
    const matched = faq.keywords.some((kw) => normalized.includes(kw));
    if (matched) {
      const answerMap = {
        english: faq.answer_en,
        urdu: faq.answer_ur,
        roman_urdu: faq.answer_ro,
      };
      return { answer: answerMap[lang], language: lang };
    }
  }

  return null;
}

// ──────────────────────────────────────
// Enhanced FAQ Matching (Static + Dynamic)
// Checks static FAQs first, then approved dynamic FAQs from AILearning
// ──────────────────────────────────────

let dynamicFAQCache: {
  data: Array<{ input: string; output: string; language: string; confidence: number }>;
  timestamp: number;
} | null = null;

const DYNAMIC_FAQ_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getDynamicFAQs(): Promise<Array<{ input: string; output: string; language: string; confidence: number }>> {
  // Check cache first
  if (dynamicFAQCache && Date.now() - dynamicFAQCache.timestamp < DYNAMIC_FAQ_CACHE_TTL_MS) {
    return dynamicFAQCache.data;
  }

  try {
    const approvedFAQs = await db.aILearning.findMany({
      where: {
        status: { in: ['APPROVED', 'AUTO_APPROVED', 'DEPLOYED'] },
        type: { in: ['FAQ_CANDIDATE', 'KNOWLEDGE_UPDATE'] },
        confidence: { gte: 0.6 },
      },
      orderBy: { confidence: 'desc' },
      take: 50,
      select: {
        input: true,
        output: true,
        language: true,
        confidence: true,
      },
    });

    // Type cast: language can be null from DB but we treat it as string
    const typedFAQs = approvedFAQs.map((f) => ({
      input: f.input,
      output: f.output,
      language: f.language ?? 'english',
      confidence: f.confidence,
    }));

    dynamicFAQCache = {
      data: typedFAQs,
      timestamp: Date.now(),
    };

    return typedFAQs;
  } catch (error) {
    console.error('[AI Agent] Failed to load dynamic FAQs:', error);
    return [];
  }
}

function fuzzyMatch(message: string, faqInput: string): number {
  const msgTokens = new Set(message.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w) => w.length > 1));
  const faqTokens = new Set(faqInput.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w) => w.length > 1));

  if (msgTokens.size === 0 && faqTokens.size === 0) return 0;

  let matches = 0;
  for (const token of msgTokens) {
    if (faqTokens.has(token)) matches++;
  }

  const union = new Set([...msgTokens, ...faqTokens]).size;
  return union === 0 ? 0 : matches / union;
}

export async function getEnhancedFAQMatch(message: string): Promise<{ answer: string; language: DetectedLanguage; source: 'static' | 'dynamic' } | null> {
  // Step 1: Check static FAQ (fast, no DB call)
  const staticMatch = matchFAQ(message);
  if (staticMatch) {
    return { ...staticMatch, source: 'static' };
  }

  // Step 2: Check dynamic FAQs from AILearning table
  const lang = detectLanguage(message);
  const dynamicFAQs = await getDynamicFAQs();

  let bestMatch: { answer: string; language: string; confidence: number; input: string } | null = null;
  let bestSimilarity = 0;

  for (const faq of dynamicFAQs) {
    const similarity = fuzzyMatch(message, faq.input);
    if (similarity >= 0.5 && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { ...faq, answer: faq.output };
    }
  }

  if (bestMatch) {
    return {
      answer: bestMatch.answer,
      language: (bestMatch.language as DetectedLanguage) || lang,
      source: 'dynamic',
    };
  }

  return null;
}

// ──────────────────────────────────────
// Handoff Trigger Detection
// ──────────────────────────────────────

export function shouldHandoffToHuman(message: string): boolean {
  const normalized = message.toLowerCase();
  const handoffTriggers = [
    'talk to human', 'speak to someone', 'real person', 'live agent',
    'complaint', 'complain', 'refund', 'cancel membership', 'unsatisfied',
    'manager', 'supervisor', 'negotiate', 'discount', 'lower price',
    'cheaper', 'expensive', 'not happy', 'angry', 'frustrated',
    'insaan', 'banda', 'manager se baat', 'shikayat', 'wapas',
    'behtar rate', 'kam price', 'discount do', 'refunds',
  ];
  return handoffTriggers.some((t) => normalized.includes(t));
}
