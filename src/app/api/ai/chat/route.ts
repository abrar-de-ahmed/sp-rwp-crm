import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { callLLM, parseJSONResponse, getEnhancedFAQMatch, detectLanguage, shouldHandoffToHuman } from '@/lib/ai-agent';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { recordAIConversation, getLearningContext } from '@/lib/ai-learning';

// ──────────────────────────────────────
// POST /api/ai/chat — Customer-facing bot
// Enhanced with AI Learning Engine integration
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { messageText, channel, leadId } = body;

    if (!messageText?.trim() || !channel) {
      return NextResponse.json(
        { error: 'messageText and channel are required' },
        { status: 400 },
      );
    }

    if (!['WHATSAPP', 'INSTAGRAM', 'FACEBOOK'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be WHATSAPP, INSTAGRAM, or FACEBOOK' },
        { status: 400 },
      );
    }

    const detectedLang = detectLanguage(messageText);
    let responseSource: 'faq_match' | 'llm' | 'handoff' = 'llm';
    let aiMessage = '';

    // Fetch lead info for context
    let leadStatus = 'NEW';
    let leadTemperature = 'COLD';
    if (leadId) {
      const lead = await db.lead.findUnique({
        where: { id: leadId },
        select: { status: true, temperature: true },
      });
      if (lead) {
        leadStatus = lead.status;
        leadTemperature = lead.temperature;
      }
    }

    // 1. Check for handoff triggers
    if (shouldHandoffToHuman(messageText)) {
      await createAuditLog({
        actorType: 'AI_AGENT',
        actorId: '2',
        actorName: 'Customer Bot',
        entityType: 'CONVERSATION',
        entityId: leadId || null,
        action: 'UPDATE',
        remarks: `Handoff requested via ${channel}: "${messageText.substring(0, 100)}"`,
      });

      const handoffMessages = {
        english: "I'll connect you with one of our team members who can help you better. Please hold on for a moment!",
        urdu: 'میں آپ کو ہماری ٹیم کے کسی رکن سے جوڑ دوں گا جو آپ کی بہتر مدد کر سکے۔ براہ کرم ایک لمحہ انتظار کریں!',
        roman_urdu: 'Main aap ko hamare team ke kisi member se connect kar doon ga jo aap ki behtar madad kar sake. Bara karm ek lamha intezar karein!',
      };

      aiMessage = handoffMessages[detectedLang];
      responseSource = 'handoff';

      // Record conversation (non-blocking)
      if (leadId) {
        recordAIConversation({
          leadId,
          channel,
          customerMessage: messageText,
          aiResponse: aiMessage,
          agentId: 2,
          responseSource,
          language: detectedLang,
          leadStatus,
          leadTemperature,
        }).catch(() => {});
      }

      return NextResponse.json({
        message: aiMessage,
        handoffNeeded: true,
        language: detectedLang,
        leadData: null,
        source: 'handoff',
      });
    }

    // 2. Try enhanced FAQ matching (static + dynamic from learning)
    const faqMatch = await getEnhancedFAQMatch(messageText);
    if (faqMatch) {
      aiMessage = faqMatch.answer;
      responseSource = 'faq_match';

      // Record conversation (non-blocking)
      if (leadId) {
        recordAIConversation({
          leadId,
          channel,
          customerMessage: messageText,
          aiResponse: aiMessage,
          agentId: 2,
          responseSource,
          language: detectedLang,
          leadStatus,
          leadTemperature,
        }).catch(() => {});
      }

      return NextResponse.json({
        message: aiMessage,
        handoffNeeded: false,
        language: faqMatch.language,
        leadData: null,
        source: 'faq_match',
        faqSource: faqMatch.source, // 'static' or 'dynamic'
      });
    }

    // 3. Get conversation history for context
    let conversationHistory = '';
    if (leadId) {
      const recentMessages = await db.conversation.findMany({
        where: { leadId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: { messageText: true, direction: true, sentBy: true },
      });
      if (recentMessages.length > 0) {
        conversationHistory = recentMessages
          .reverse()
          .map((m) => `[${m.direction === 'INBOUND' ? 'Customer' : m.sentBy}]: ${m.messageText}`)
          .join('\n');
      }
    }

    // 4. Get learning context for enhanced LLM prompt
    const learningContext = await getLearningContext({ channel, language: detectedLang });

    // 5. Build prompt for LLM
    const prompt = `Incoming message from ${channel}:
${conversationHistory ? `Conversation history:\n${conversationHistory}\n\n` : ''}Customer: ${messageText}

Detected language: ${detectedLang}
${leadId ? `Lead ID: ${leadId}, Status: ${leadStatus}, Temperature: ${leadTemperature}` : 'No lead associated yet.'}

Please respond to the customer's message. Remember to:
- Reply in the same language detected (${detectedLang})
- Answer questions about Sports Pavilion Rawalpindi
- If they seem interested in facilities, note which ones
- If they ask about pricing, provide ranges and suggest a visit
- Keep responses concise but friendly`;

    const systemPrompt = `You are the AI Customer Bot for Sports Pavilion Rawalpindi. You handle customer inquiries on WhatsApp, Instagram, and Facebook.

BUSINESS INFO:
- Location: Sports Pavilion, Rawalpindi, Pakistan
- Timings: Mon-Sat 6:00 AM - 11:00 PM, Sunday 7:00 AM - 10:00 PM
- Facilities: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, Jogging track
- Memberships: Monthly (₨5,000-8,000), Bi-Annual (₨25,000-40,000), Annual (₨45,000-70,000), Family packages available
- Day passes: ₨500 per person, ₨800 family of 4
- Corporate packages available with custom pricing

RULES:
1. Detect language (English, Urdu script, Roman Urdu) and reply in same language
2. Be polite, professional, and helpful
3. Answer FAQs accurately
4. For pricing, mention plans briefly and suggest a visit
5. Collect lead info if interested: name, phone, preferred date/time
6. NEVER make up pricing or info not provided
7. If frustrated/complaint/negotiation: handoff with "I'll connect you with a team member"

RESPOND ONLY WITH JSON: {"message": "<your reply>", "handoffNeeded": <boolean>, "leadData": {"interestedFacilities": ["<facilities>"], "urgency": "<low|medium|high>", "budgetInterest": <boolean>} or null}`;

    // Call LLM with learning context injected
    const llmResponse = await callLLM(prompt, systemPrompt, {
      temperature: 0.5,
      maxTokens: 500,
      learningContext: learningContext || undefined,
    });

    let result;
    try {
      result = parseJSONResponse(llmResponse) as {
        message: string;
        handoffNeeded: boolean;
        leadData: { interestedFacilities: string[]; urgency: string; budgetInterest: boolean } | null;
      };
    } catch {
      result = {
        message: llmResponse || 'Thank you for your interest in Sports Pavilion Rawalpindi! How can I help you today?',
        handoffNeeded: false,
        leadData: null,
      };
    }

    aiMessage = result.message;

    // 6. Log AI conversation (audit)
    if (leadId) {
      await createAuditLog({
        actorType: 'AI_AGENT',
        actorId: '2',
        actorName: 'Customer Bot',
        entityType: 'CONVERSATION',
        entityId: leadId,
        action: 'UPDATE',
        remarks: `AI response via ${channel} (${detectedLang}): "${aiMessage.substring(0, 100)}"`,
      });

      // Record conversation for learning (non-blocking)
      recordAIConversation({
        leadId,
        channel,
        customerMessage: messageText,
        aiResponse: aiMessage,
        agentId: 2,
        responseSource,
        language: detectedLang,
        leadStatus,
        leadTemperature,
      }).catch(() => {});
    }

    return NextResponse.json({
      message: aiMessage,
      handoffNeeded: result.handoffNeeded ?? false,
      language: detectedLang,
      leadData: result.leadData,
      source: 'llm',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to generate response';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
