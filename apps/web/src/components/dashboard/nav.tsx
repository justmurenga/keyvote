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
  Send,
  X,
  ChevronDown,
  Compass,
  Megaphone,
  ShieldCheck,
  Building2,
  Cog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'voter' | 'candidate' | 'admin' | 'system_admin' | 'party_admin' | string;

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Visual accent for the group header / active items. */
  accent: 'slate' | 'emerald' | 'rose' | 'indigo' | 'amber';
  /** If set, the group is only rendered when the user has one of these roles. */
  roles?: Role[];
  /** Whether the group is open by default (when no other signal applies). */
  defaultOpen?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'general',
    label: 'General',
    icon: Compass,
    accent: 'slate',
    defaultOpen: true,
    items: [
      { href: '/dashboard', label: 'Overview', icon: Home },
      { href: '/dashboard/profile', label: 'My Profile', icon: User },
      { href: '/dashboard/following', label: 'Following', icon: Heart },
      { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
      { href: '/dashboard/polls', label: 'Polls', icon: BarChart3 },
      { href: '/dashboard/results', label: 'Results', icon: Vote },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
      {
        href: '/dashboard/become-candidate',
        label: 'Become a Candidate',
        icon: UserPlus,
        roles: ['voter', 'admin', 'system_admin', 'party_admin'],
      },
    ],
  },
  {
    id: 'candidate',
    label: 'Candidate Tools',
    icon: Megaphone,
    accent: 'emerald',
    roles: ['candidate'],
    defaultOpen: true,
    items: [
      { href: '/dashboard/candidate', label: 'My Campaign', icon: TrendingUp },
      { href: '/dashboard/candidate/profile', label: 'Edit Campaign', icon: Edit },
      { href: '/dashboard/candidate/analytics', label: 'Follower Analytics', icon: PieChart },
      { href: '/dashboard/candidate/agents', label: 'My Agents', icon: Shield },
      { href: '/dashboard/candidate/messages', label: 'Agent Messages', icon: MessageSquare },
      { href: '/dashboard/candidate/sms', label: 'Bulk SMS', icon: Send },
      { href: '/dashboard/candidate/results', label: 'My Results', icon: Vote },
      { href: '/dashboard/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    id: 'party',
    label: 'Party Officials',
    icon: Building2,
    accent: 'indigo',
    roles: ['party_admin'],
    defaultOpen: true,
    items: [
      { href: '/dashboard/admin/polls', label: 'Manage Polls', icon: ClipboardList },
      { href: '/dashboard/admin/poll-analytics', label: 'Poll Analytics', icon: PieChart },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: ShieldCheck,
    accent: 'rose',
    roles: ['admin', 'system_admin'],
    defaultOpen: true,
    items: [
      { href: '/dashboard/admin/polls', label: 'Manage Polls', icon: ClipboardList },
      { href: '/dashboard/admin/poll-analytics', label: 'Poll Analytics', icon: PieChart },
      { href: '/dashboard/admin/users', label: 'Manage Users', icon: UserCog },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
      { href: '/dashboard/agents', label: 'Agents', icon: Shield },
      { href: '/dashboard/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Cog,
    accent: 'amber',
    defaultOpen: false,
    items: [
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const accentClasses: Record<NavGroup['accent'], { dot: string; activeBg: string; activeText: string; ring: string }> = {
  slate:   { dot: 'bg-slate-500',   activeBg: 'bg-slate-100 dark:bg-slate-800',     activeText: 'text-slate-900 dark:text-slate-50',     ring: 'ring-slate-300/60' },
  emerald: { dot: 'bg-emerald-500', activeBg: 'bg-emerald-100 dark:bg-emerald-900/40', activeText: 'text-emerald-900 dark:text-emerald-50', ring: 'ring-emerald-300/60' },
  rose:    { dot: 'bg-rose-500',    activeBg: 'bg-rose-100 dark:bg-rose-900/40',    activeText: 'text-rose-900 dark:text-rose-50',       ring: 'ring-rose-300/60' },
  indigo:  { dot: 'bg-indigo-500',  activeBg: 'bg-indigo-100 dark:bg-indigo-900/40', activeText: 'text-indigo-900 dark:text-indigo-50',   ring: 'ring-indigo-300/60' },
  amber:   { dot: 'bg-amber-500',   activeBg: 'bg-amber-100 dark:bg-amber-900/40',   activeText: 'text-amber-900 dark:text-amber-50',     ring: 'ring-amber-300/60' },
};

interface DashboardNavProps {
  role: string;
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter groups + items by role
  const visibleGroups = navGroups
    .filter((g) => !g.roles || g.roles.includes(role))
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);

  // Persisted collapsible state (per group). Auto-open the group containing
  // the current route so users always see context.
  const storageKey = `myvote:nav:open:${role}`;
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    visibleGroups.forEach((g) => {
      initial[g.id] = g.defaultOpen ?? false;
    });
    return initial;
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setOpenMap((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Force-open the group that owns the active route
  useEffect(() => {
    const activeGroup = visibleGroups.find((g) =>
      g.items.some(
        (i) => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)),
      ),
    );
    if (activeGroup && !openMap[activeGroup.id]) {
      setOpenMap((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Friendly label for the role badge at the top of the sidebar
  const roleLabel = (() => {
    switch (role) {
      case 'system_admin': return 'System Admin';
      case 'admin': return 'Administrator';
      case 'party_admin': return 'Party Official';
      case 'candidate': return 'Candidate';
      case 'voter': return 'Voter';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  })();

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
    <div className="flex-1 overflow-y-auto">
      {/* Role indicator badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Signed in as
            </span>
            <span className="text-xs font-semibold">{roleLabel}</span>
          </div>
        </div>
      </div>

      <nav className="px-3 pb-4 space-y-3">
        {visibleGroups.map((group) => {
          const accent = accentClasses[group.accent];
          const isOpen = openMap[group.id] ?? false;
          const GroupIcon = group.icon;
          const hasActive = group.items.some(
            (i) => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)),
          );

          return (
            <div
              key={group.id}
              className={cn(
                'rounded-xl border bg-card/40',
                hasActive && 'ring-1',
                hasActive && accent.ring,
              )}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                aria-controls={`nav-group-${group.id}`}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-xl hover:bg-muted/60 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-md text-white shrink-0',
                      accent.dot,
                    )}
                  >
                    <GroupIcon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Section
                    </span>
                    <span className="text-sm font-semibold truncate">{group.label}</span>
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform shrink-0',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              {isOpen && (
                <ul
                  id={`nav-group-${group.id}`}
                  className="px-2 pb-2 pt-1 space-y-0.5 border-t"
                >
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'group flex items-center gap-3 pl-3 pr-3 py-2 rounded-lg text-sm font-medium transition-colors border-l-2 border-transparent',
                            isActive
                              ? cn(accent.activeBg, accent.activeText, 'border-current')
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
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
    supportEmail: 'support@keyvote.online',
  });

  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        setContactInfo({
          ussdCode: data.ussdCode || '*123#',
          supportPhone: data.supportPhone || '+254 700 000 000',
          supportEmail: data.supportEmail || 'support@keyvote.online',
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
