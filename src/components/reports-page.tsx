'use client';

import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaceholderUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ReportsPage({ user }: { user: PlaceholderUser }) {
  return (
    <Card className="max-w-lg mx-auto mt-20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-emerald-600" />
        </div>
        <CardTitle className="text-2xl">Reports & Analytics</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          Generate daily, weekly, monthly, and quarterly reports. Track conversion funnels, rep performance, lead source ROI, and revenue metrics.
        </p>
        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
          Phase 2
        </Badge>
      </CardContent>
    </Card>
  );
}
