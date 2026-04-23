'use client';

import { Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaceholderUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AIAgentsPage({ user }: { user: PlaceholderUser }) {
  return (
    <Card className="max-w-lg mx-auto mt-20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Bot className="w-8 h-8 text-emerald-600" />
        </div>
        <CardTitle className="text-2xl">AI Agents</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          Configure and monitor your 5 AI agents: Lead Capture, Customer Bot, Call Monitor, Follow-Up Agent, and Reporting Agent. View real-time status and performance.
        </p>
        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
          Phase 2
        </Badge>
      </CardContent>
    </Card>
  );
}
