'use client';

import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaceholderUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage({ user }: { user: PlaceholderUser }) {
  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
          <p className="text-muted-foreground mt-3">Access Denied. Super Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="max-w-lg mx-auto mt-20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Settings className="w-8 h-8 text-emerald-600" />
        </div>
        <CardTitle className="text-2xl">System Settings</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          Configure Twilio integration, SLA rules, escalation settings, AI agent behavior, and system preferences.
        </p>
        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
          Phase 4
        </Badge>
      </CardContent>
    </Card>
  );
}
