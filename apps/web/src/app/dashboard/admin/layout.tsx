'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCheck,
  Building2,
  MapPin,
  Vote,
  Wallet,
  Settings,
  ArrowLeft,
  Shield,
  PieChart,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const adminNavItems: AdminNavItem[] = [
  { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users, permission: 'users:view' },
  { href: '/dashboard/admin/polls', label: 'Polls', icon: ClipboardList, permission: 'polls:edit' },
  { href: '/dashboard/admin/poll-analytics', label: 'Poll Analytics', icon: PieChart, permission: 'polls:edit' },
  { href: '/dashboard/admin/candidates', label: 'Candidates', icon: UserCheck, permission: 'candidates:edit' },
  { href: '/dashboard/admin/parties', label: 'Political Parties', icon: Building2, permission: 'parties:edit' },
  { href: '/dashboard/admin/regions', label: 'Electoral Regions', icon: MapPin, permission: 'regions:view' },
  { href: '/dashboard/admin/results', label: 'Election Results', icon: Vote, permission: 'results:verify' },
  { href: '/dashboard/admin/wallets', label: 'Wallets', icon: Wallet, permission: 'wallet:view_all' },
  { href: '/dashboard/admin/sms', label: 'SMS Management', icon: MessageSquare, permission: 'settings:system' },
  { href: '/dashboard/admin/settings', label: 'System Settings', icon: Settings, permission: 'settings:system' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { can, isAdmin, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don&apos;t have permission to access admin pages.</p>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const filteredItems = adminNavItems.filter(
    (item) => !item.permission || can(item.permission as any)
  );

  return (
    <div className="flex gap-0 -m-6 lg:-m-8 min-h-[calc(100vh-64px)]">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r bg-background shrink-0">
        {/* Admin Badge */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-500/10">
              <Shield className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Admin Panel</p>
              <p className="text-xs text-muted-foreground">System Management</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive =
              (item.href === '/dashboard/admin' && pathname === '/dashboard/admin') ||
              (item.href !== '/dashboard/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to Dashboard */}
        <div className="p-3 border-t">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Admin Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
