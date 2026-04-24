'use client';

import {
  LayoutDashboard,
  Inbox,
  Users,
  Columns3,
  Clock,
  Phone,
  HelpCircle,
  UsersRound,
  Mic,
  BarChart3,
  CreditCard,
  Bot,
  Brain,
  Wifi,
  Download,
  FileText,
  Upload,
  Settings,
  UserCog,
  Trophy,
  X,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { signOut } from 'next-auth/react';

export type PageId =
  | 'dashboard'
  | 'unified-inbox'
  | 'leads'
  | 'pipeline'
  | 'follow-ups'
  | 'call-history'
  | 'help'
  | 'team'
  | 'call-recordings'
  | 'reports'
  | 'memberships'
  | 'ai-agents'
  | 'ai-insights'
  | 'channel-setup'
  | 'data-export'
  | 'audit-log'
  | 'data-import'
  | 'settings'
  | 'team-management';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
}

const salesRepItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'unified-inbox', label: 'Unified Inbox', icon: <Inbox className="w-4 h-4" /> },
  { id: 'leads', label: 'My Leads', icon: <Users className="w-4 h-4" /> },
  { id: 'pipeline', label: 'Pipeline', icon: <Columns3 className="w-4 h-4" /> },
  { id: 'follow-ups', label: 'Follow-Ups', icon: <Clock className="w-4 h-4" /> },
  { id: 'call-history', label: 'Call History', icon: <Phone className="w-4 h-4" /> },
  { id: 'help', label: 'Help', icon: <HelpCircle className="w-4 h-4" /> },
];

const adminItems: NavItem[] = [
  { id: 'team', label: 'Team', icon: <UsersRound className="w-4 h-4" /> },
  { id: 'call-recordings', label: 'Call Recordings', icon: <Mic className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'memberships', label: 'Memberships', icon: <CreditCard className="w-4 h-4" /> },
];

const superAdminItems: NavItem[] = [
  { id: 'ai-agents', label: 'AI Agents', icon: <Bot className="w-4 h-4" /> },
  { id: 'ai-insights', label: 'AI Insights', icon: <Brain className="w-4 h-4" /> },
  { id: 'channel-setup', label: 'Channel Setup', icon: <Wifi className="w-4 h-4" /> },
  { id: 'data-export', label: 'Data Export', icon: <Download className="w-4 h-4" /> },
  { id: 'audit-log', label: 'Audit Log', icon: <FileText className="w-4 h-4" /> },
  { id: 'data-import', label: 'Data Import', icon: <Upload className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  { id: 'team-management', label: 'Team Management', icon: <UserCog className="w-4 h-4" /> },
];

function getMenuItems(role: string): NavItem[] {
  const items = [...salesRepItems];
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    // Change the leads label to 'All Leads' for admins — create new object to avoid mutation
    const leadsIdx = items.findIndex((i) => i.id === 'leads');
    if (leadsIdx !== -1) {
      items[leadsIdx] = { ...items[leadsIdx], label: 'All Leads' };
    }
    items.splice(2, 0, ...adminItems);
  }
  if (role === 'SUPER_ADMIN') {
    items.splice(items.indexOf(items.find(i => i.id === 'help')!), 0, ...superAdminItems);
  }
  return items;
}

interface SidebarProps {
  role: string;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onClose?: () => void;
  isOpen?: boolean;
  isMobile?: boolean;
}

export function SidebarNav({ role, activePage, onNavigate, onClose, isMobile }: SidebarProps) {
  const menuItems = getMenuItems(role);

  return (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 shadow-md shadow-emerald-200/50">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-sidebar-foreground leading-tight">
            Sports Pavilion
          </h2>
          <p className="text-xs text-sidebar-foreground/50 leading-tight">
            CRM System
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Separator className="bg-sidebar-border opacity-50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (isMobile && onClose) onClose();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-150 cursor-pointer text-left
                  ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }
                `}
              >
                <span className={isActive ? 'text-emerald-400' : 'text-sidebar-foreground/40'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer / Logout */}
      <div className="p-3">
        <Separator className="bg-sidebar-border opacity-50 mb-3" />
        <button
          onClick={async () => {
            await signOut({ callbackUrl: '/' });
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
            text-sidebar-foreground/60 hover:text-red-400 hover:bg-red-500/10
            transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}

// Page title mapping
export const pageTitles: Record<PageId, string> = {
  dashboard: 'Dashboard',
  'unified-inbox': 'Unified Inbox',
  leads: 'Leads',
  pipeline: 'Pipeline',
  'follow-ups': 'Follow-Ups',
  'call-history': 'Call History',
  help: 'Help',
  team: 'Team',
  'call-recordings': 'Call Recordings',
  reports: 'Reports',
  memberships: 'Memberships',
  'ai-agents': 'AI Agents',
  'ai-insights': 'AI Insights',
  'channel-setup': 'Channel Setup',
  'data-export': 'Data Export',
  'audit-log': 'Audit Log',
  'data-import': 'Data Import',
  settings: 'Settings',
  'team-management': 'Team Management',
};
