'use client';

import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaceholderUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function DataExportPage({ user }: { user: PlaceholderUser }) {
  return (
    <Card className="max-w-lg mx-auto mt-20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Download className="w-8 h-8 text-emerald-600" />
        </div>
        <CardTitle className="text-2xl">Data Export</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          Download CRM data in CSV, Excel, or PDF format. Available for Super Admin with custom date range selection.
        </p>
        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
          Phase 2
        </Badge>
      </CardContent>
    </Card>
  );
}
