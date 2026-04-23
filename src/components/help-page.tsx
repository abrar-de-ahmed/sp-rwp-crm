'use client';

import { useState } from 'react';
import {
  HelpCircle,
  RefreshCw,
  Mail,
  MessageSquareQuote,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface HelpUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ──────────────────────────────────────
// FAQ Data
// ──────────────────────────────────────

const faqItems = [
  {
    id: 'faq-1',
    question: 'How do I add a new lead?',
    answer:
      "Click the 'Add Lead' button on the Leads page. Fill in the lead's name, phone number, email, source, and type. The lead will be automatically assigned to a sales rep based on current workload.",
  },
  {
    id: 'faq-2',
    question: 'How do I change a lead\'s status?',
    answer:
      "Open the lead detail page and click the status buttons to change between New, Contacted, Interested, Negotiation, Booked, and Lost. Each status change is logged in the audit trail.",
  },
  {
    id: 'faq-3',
    question: 'What do the temperature colors mean?',
    answer:
      'Temperature colors indicate lead urgency:\n\n• Red = Hot — Call immediately! The lead is ready to convert.\n• Yellow = Warm — Call within 2 hours. The lead has shown high interest.\n• Blue = Cold — Nurture over time. The lead needs more information or follow-up.',
  },
  {
    id: 'faq-4',
    question: 'How do I log a call?',
    answer:
      "Click the Call button on a lead's detail page. Enter call notes, outcome, and duration. The call will be logged in your Call History with an AI-generated summary if available.",
  },
  {
    id: 'faq-5',
    question: 'What does the AI do?',
    answer:
      'Our AI agents automatically qualify leads, handle customer messages across channels, monitor call quality, suggest follow-ups, and generate performance reports. AI features are configurable by Super Admins in Settings.',
  },
  {
    id: 'faq-6',
    question: 'How do I reset my tour?',
    answer:
      'Click the "Restart Onboarding Tour" button below to clear your tour progress and restart the guided walkthrough of the CRM.',
  },
];

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function HelpPage({ user }: { user: HelpUser }) {
  const { toast } = useToast();

  const handleRestartTour = () => {
    // Clear tour completion for this user
    localStorage.removeItem(`sp_crm_tour_completed_${user.email}`);
    toast({
      title: 'Tour Reset',
      description: 'Reload the page to start the onboarding tour again.',
    });
    // Trigger a page reload after a brief delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Help & Support</h2>
        <p className="text-sm text-muted-foreground">
          Frequently asked questions and resources
        </p>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5 text-emerald-600" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pt-1">
                    {item.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Restart Tour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Onboarding Tour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            New to the CRM or want a refresher? Restart the guided tour to learn about all the features.
          </p>
          <Button
            variant="outline"
            onClick={handleRestartTour}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Restart Onboarding Tour
          </Button>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-600" />
            Contact Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Need help with something not covered here? Reach out to our support team.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 font-mono">
              admin@spcrm.com
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Version */}
      <div className="text-center py-4">
        <Separator className="mb-4" />
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Sports Pavilion CRM v1.0 — Phase 1
        </Badge>
      </div>
    </div>
  );
}
