'use client';

import { useSession, SessionProvider } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import Login from '@/components/login';
import CRMLayout from '@/components/crm-layout';

function AuthGate() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-2xl mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <CRMLayout
      userName={session.user.name}
      userEmail={session.user.email}
      userRole={session.user.role}
      userId={session.user.id}
    />
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <AuthGate />
    </SessionProvider>
  );
}
