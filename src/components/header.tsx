'use client';

import { signOut } from 'next-auth/react';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import NotificationDropdown from '@/components/notification-dropdown';
import type { PageId } from '@/components/sidebar';

interface HeaderProps {
  pageTitle: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userId: string;
  onMenuToggle: () => void;
  onNavigate?: (page: PageId, leadId?: string) => void;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Manager',
  SALES_REP: 'Sales Rep',
};

const roleBadgeClass: Record<string, string> = {
  SUPER_ADMIN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ADMIN: 'bg-amber-100 text-amber-800 border-amber-200',
  SALES_REP: 'bg-sky-100 text-sky-800 border-sky-200',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Header({
  pageTitle,
  userName,
  userEmail,
  userRole,
  userId,
  onMenuToggle,
  onNavigate,
}: HeaderProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border/60 backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Menu toggle + Page title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <NotificationDropdown
            userId={userId}
            onNavigate={(page, leadId) => {
              if (onNavigate && leadId) {
                onNavigate('leads' as PageId);
              } else if (onNavigate && page) {
                onNavigate(page as PageId);
              }
            }}
          />

          <Separator orientation="vertical" className="h-8 mx-1" />

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground leading-tight">
                {userName}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {userEmail}
              </p>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <Badge
              variant="outline"
              className={`hidden sm:inline-flex text-xs ${roleBadgeClass[userRole] ?? ''}`}
            >
              {roleLabels[userRole] ?? userRole}
            </Badge>

            <Separator orientation="vertical" className="h-8 mx-1 hidden sm:block" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-red-600 gap-2 hidden sm:inline-flex"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
