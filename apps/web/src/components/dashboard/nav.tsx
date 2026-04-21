'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  User,
  BarChart3,
  Vote,
  Bell,
  Wallet,
  Settings,
  Shield,
  UserCog,
  FileText,
  MessageSquare,
  Heart,
  ClipboardList,
  PieChart,
  TrendingUp,
  UserPlus,
  Edit,
  Eye,
  Send,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  separator?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/following', label: 'Following', icon: Heart },
  { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
  { href: '/dashboard/polls', label: 'Polls', icon: BarChart3 },
  { href: '/dashboard/results', label: 'Results', icon: Vote },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },

  // Candidate-only section
  { href: '/dashboard/become-candidate', label: 'Become a Candidate', icon: UserPlus, roles: ['voter', 'admin', 'system_admin', 'party_admin'], separator: true },
  { href: '/dashboard/candidate', label: 'My Campaign', icon: TrendingUp, roles: ['candidate'], separator: true },
  { href: '/dashboard/candidate/profile', label: 'Edit Campaign', icon: Edit, roles: ['candidate'] },
  { href: '/dashboard/candidate/analytics', label: 'Follower Analytics', icon: PieChart, roles: ['candidate'] },
  { href: '/dashboard/candidate/agents', label: 'My Agents', icon: Shield, roles: ['candidate'] },
  { href: '/dashboard/candidate/messages', label: 'Agent Messages', icon: MessageSquare, roles: ['candidate'] },
  { href: '/dashboard/candidate/sms', label: 'Bulk SMS', icon: Send, roles: ['candidate'] },
  { href: '/dashboard/candidate/results', label: 'My Results', icon: Vote, roles: ['candidate'] },

  // Legacy links for candidates (also shown)
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, roles: ['admin', 'system_admin'] },
  { href: '/dashboard/agents', label: 'Agents', icon: Shield, roles: ['admin', 'system_admin'] },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText, roles: ['candidate', 'admin', 'system_admin'] },

  // Admin section
  { href: '/dashboard/admin/polls', label: 'Manage Polls', icon: ClipboardList, roles: ['admin', 'system_admin', 'party_admin'], separator: true },
  { href: '/dashboard/admin/poll-analytics', label: 'Poll Analytics', icon: PieChart, roles: ['admin', 'system_admin', 'party_admin'] },
  { href: '/dashboard/admin/users', label: 'Manage Users', icon: UserCog, roles: ['admin', 'system_admin'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, separator: true },
];

interface DashboardNavProps {
  role: string;
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  // Listen for the hamburger button in the header (which lives in a separate
  // component tree). A simple custom event keeps the server-rendered layout
  // untouched and avoids having to introduce a global state library.
  useEffect(() => {
    const handler = () => setMobileOpen((open) => !open);
    window.addEventListener('myvote:toggle-sidebar', handler);
    return () => window.removeEventListener('myvote:toggle-sidebar', handler);
  }, []);

  // Close the drawer whenever the route changes, the viewport grows past the
  // mobile breakpoint, or the user presses Escape.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    // Prevent background scroll while the drawer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  const navList = (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {filteredItems.map((item, index) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
          <div key={item.href}>
            {item.separator && index > 0 && (
              <hr className="my-2 border-border" />
            )}
            <Link
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-background h-[calc(100vh-64px)] sticky top-16">
        {navList}
        <SidebarHelpInfo />
      </aside>

      {/* Mobile slide-over drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[60] transition-opacity',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />

        {/* Panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          className={cn(
            'absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-background border-r shadow-xl flex flex-col transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <span className="font-bold">Menu</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-2 -mr-2 rounded-md hover:bg-muted"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {navList}
          <SidebarHelpInfo />
        </aside>
      </div>
    </>
  );
}

function SidebarHelpInfo() {
  const [contactInfo, setContactInfo] = useState({
    ussdCode: '*123#',
    supportPhone: '+254 700 000 000',
    supportEmail: 'support@myvote.co.ke',
  });

  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        setContactInfo({
          ussdCode: data.ussdCode || '*123#',
          supportPhone: data.supportPhone || '+254 700 000 000',
          supportEmail: data.supportEmail || 'support@myvote.co.ke',
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-4 border-t">
      <div className="rounded-lg bg-primary/10 p-4">
        <p className="text-sm font-medium">Need help?</p>
        <p className="text-xs text-muted-foreground mt-1">
          USSD: {contactInfo.ussdCode} | WhatsApp: {contactInfo.supportPhone}
        </p>
      </div>
    </div>
  );
}
