'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import Header from '@/components/header';
import { SidebarNav, pageTitles, type PageId } from '@/components/sidebar';
import Dashboard from '@/components/dashboard';
import LeadsPage from '@/components/leads-page';
import PipelinePage from '@/components/pipeline-page';
import FollowUpsPage from '@/components/followups-page';
import AuditLogPage from '@/components/audit-log-page';
import TeamManagementPage from '@/components/team-management-page';
import CallHistoryPage from '@/components/call-history-page';
import DataImportPage from '@/components/data-import-page';
import HelpPage from '@/components/help-page';
import ChannelSetupPage from '@/components/channel-setup-page';
import AIAgentsPage from '@/components/ai-agents-page';
import AIInsightsPage from '@/components/ai-insights-page';
import ReportsPage from '@/components/reports-page';
import DataExportPage from '@/components/data-export-page';
import MembershipsPage from '@/components/memberships-page';
import SettingsPage from '@/components/settings-page';
import TeamPage from '@/components/team-page';
import CallRecordingsPage from '@/components/call-recordings-page';
import UnifiedInboxPage from '@/components/unified-inbox-page';
import OnboardingTour from '@/components/onboarding-tour';

// ──────────────────────────────────────
// Sidebar data-target-id mapping
// ──────────────────────────────────────
// We inject data-target-id attributes onto sidebar buttons so the
// onboarding tour can highlight them.  This avoids modifying sidebar.tsx.

const SIDEBAR_LABEL_MAP: Record<string, string> = {
  Dashboard: 'sidebar-dashboard',
  Leads: 'sidebar-leads',
  'All Leads': 'sidebar-leads',
  'My Leads': 'sidebar-leads',
  Pipeline: 'sidebar-pipeline',
  'Follow-Ups': 'sidebar-follow-ups',
  'Call History': 'sidebar-call-history',
  Help: 'sidebar-help',
  Team: 'sidebar-team',
  'Call Recordings': 'sidebar-call-recordings',
  Reports: 'sidebar-reports',
  Memberships: 'sidebar-memberships',
  'AI Agents': 'sidebar-ai-agents',
  'AI Insights': 'sidebar-ai-insights',
  'Channel Setup': 'sidebar-channel-setup',
  'Data Export': 'sidebar-data-export',
  'Audit Log': 'sidebar-audit-log',
  'Data Import': 'sidebar-data-import',
  Settings: 'sidebar-settings',
  'Team Management': 'sidebar-team-management',
  'Unified Inbox': 'sidebar-unified-inbox',
};

function injectSidebarTargetIds() {
  const sidebarBtns = document.querySelectorAll('aside button, [role="dialog"] button');
  sidebarBtns.forEach((btn) => {
    const text = btn.textContent?.trim() ?? '';
    if (SIDEBAR_LABEL_MAP[text] && !btn.hasAttribute('data-target-id')) {
      btn.setAttribute('data-target-id', SIDEBAR_LABEL_MAP[text]);
    }
  });

  // Also tag the sidebar containers
  const desktopSidebar = document.querySelector('aside.hidden.lg\\:flex');
  if (desktopSidebar) {
    desktopSidebar.setAttribute('data-target-id', 'crm-sidebar');
  }
}

// ──────────────────────────────────────
// Layout Component
// ──────────────────────────────────────

interface CRMLayoutProps {
  userName: string;
  userEmail: string;
  userRole: string;
  userId: string;
}

function PlaceholderPage({ pageId }: { pageId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <span className="text-2xl">🏗️</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        {pageTitles[pageId as PageId] ?? pageId}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        This section is under development. Check back soon for updates.
      </p>
    </div>
  );
}

export default function CRMLayout({
  userName,
  userEmail,
  userRole,
  userId,
}: CRMLayoutProps) {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Check if tour should be shown — read from localStorage without setState in effect
  const tourCompleted = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        // Listen for storage changes (e.g. from Help page reset)
        window.addEventListener('storage', onStoreChange);
        return () => window.removeEventListener('storage', onStoreChange);
      },
      [],
    ),
    () => {
      try {
        return localStorage.getItem(`sp_crm_tour_completed_${userEmail}`) ?? 'not-completed';
      } catch {
        return 'not-completed';
      }
    },
    () => 'not-completed',
  );
  const showTour = tourCompleted !== 'true';

  // Inject data-target-id attributes on sidebar buttons for the tour
  useEffect(() => {
    injectSidebarTargetIds();

    // Use MutationObserver to re-inject when sidebar DOM changes (e.g., sheet opens/closes)
    const observer = new MutationObserver(() => {
      injectSidebarTargetIds();
    });
    const desktopSidebar = document.querySelector('aside');
    if (desktopSidebar) {
      observer.observe(desktopSidebar, { childList: true, subtree: true });
    }
    // Also observe the document body for mobile sidebar sheet
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  const currentPageTitle = pageTitles[activePage] ?? 'Dashboard';

  const renderPage = () => {
    if (activePage === 'dashboard') {
      return (
        <Dashboard
          userRole={userRole}
          userName={userName}
          userId={userId}
        />
      );
    }
    if (activePage === 'unified-inbox') {
      return (
        <UnifiedInboxPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'leads') {
      return (
        <LeadsPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
          initialLeadId={selectedLeadId ?? undefined}
          onLeadOpened={() => setSelectedLeadId(null)}
        />
      );
    }
    if (activePage === 'pipeline') {
      return (
        <PipelinePage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
          onNavigateToLead={(leadId) => { setSelectedLeadId(leadId); setActivePage('leads'); }}
        />
      );
    }
    if (activePage === 'follow-ups') {
      return (
        <FollowUpsPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
          onNavigateToLead={(leadId) => { setSelectedLeadId(leadId); setActivePage('leads'); }}
        />
      );
    }
    if (activePage === 'audit-log') {
      return (
        <AuditLogPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'team-management') {
      return (
        <TeamManagementPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'call-history') {
      return (
        <CallHistoryPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
          onNavigateToLead={(leadId) => { setSelectedLeadId(leadId); setActivePage('leads'); }}
        />
      );
    }
    if (activePage === 'data-import') {
      return (
        <DataImportPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'help') {
      return (
        <HelpPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'channel-setup') {
      return (
        <ChannelSetupPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'ai-agents') {
      return (
        <AIAgentsPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'ai-insights') {
      return (
        <AIInsightsPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'reports') {
      return (
        <ReportsPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'data-export') {
      return (
        <DataExportPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'memberships') {
      return (
        <MembershipsPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'settings') {
      return (
        <SettingsPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'team') {
      return (
        <TeamPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    if (activePage === 'call-recordings') {
      return (
        <CallRecordingsPage
          user={{ id: userId, name: userName, email: userEmail, role: userRole }}
        />
      );
    }
    return <PlaceholderPage pageId={activePage} />;
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarNav
          role={userRole}
          activePage={activePage}
          onNavigate={setActivePage}
        />
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarNav
            role={userRole}
            activePage={activePage}
            onNavigate={setActivePage}
            onClose={() => setSidebarOpen(false)}
            isMobile={true}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header
          pageTitle={currentPageTitle}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userId={userId}
          onMenuToggle={() => setSidebarOpen(true)}
          onNavigate={(page, leadId) => {
            setSelectedLeadId(null);
            if (leadId) {
              // Navigate to leads page if a leadId is provided
              setSelectedLeadId(leadId);
              setActivePage('leads');
            } else {
              setActivePage(page);
            }
          }}
        />

        <main className="flex-1 p-4 lg:p-6">
          {renderPage()}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 py-3 px-4 lg:px-6 text-center text-xs text-muted-foreground mt-auto">
          Sports Pavilion Rawalpindi CRM &copy; {new Date().getFullYear()} &middot; All rights reserved
        </footer>
      </div>

      {/* Onboarding Tour Overlay */}
      {showTour && (
        <OnboardingTour
          userEmail={userEmail}
          role={userRole}
        />
      )}
    </div>
  );
}
