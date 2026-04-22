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
  DollarSign,
  KeyRound,
  FileText,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/auth/permissions';

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

const adminNavItems: AdminNavItem[] = [
  { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/admin/analytics', label: 'System Analytics', icon: Activity },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users, permission: 'users:view' },
  { href: '/dashboard/admin/roles', label: 'Role Management', icon: KeyRound, permission: 'users:view' },
  { href: '/dashboard/admin/roles/audit', label: 'Role Audit Log', icon: FileText, permission: 'users:view' },
  { href: '/dashboard/admin/polls', label: 'Polls', icon: ClipboardList, permission: 'polls:edit' },
  { href: '/dashboard/admin/poll-analytics', label: 'Poll Analytics', icon: PieChart, permission: 'polls:edit' },
  { href: '/dashboard/admin/candidates', label: 'Candidates', icon: UserCheck, permission: 'candidates:edit' },
  { href: '/dashboard/admin/parties', label: 'Political Parties', icon: Building2, permission: 'parties:edit' },
  { href: '/dashboard/admin/regions', label: 'Electoral Regions', icon: MapPin, permission: 'regions:view' },
  { href: '/dashboard/admin/results', label: 'Election Results', icon: Vote, permission: 'results:verify' },
  { href: '/dashboard/admin/wallets', label: 'Wallets', icon: Wallet, permission: 'wallet:view_all' },
  { href: '/dashboard/admin/billing', label: 'Billing & Pricing', icon: DollarSign, permission: 'settings:system' },
  { href: '/dashboard/admin/sms', label: 'SMS Management', icon: MessageSquare, permission: 'settings:system' },
  { href: '/dashboard/admin/pricing', label: 'Service Pricing', icon: DollarSign, permission: 'settings:system' },
  { href: '/dashboard/admin/settings', label: 'System Settings', icon: Settings, permission: 'settings:system' },
];

interface AdminSidebarProps {
  /** Server-resolved legacy role - used as the initial source of truth so we never show
   *  an "Access Denied" flash and can render menu items optimistically. */
  initialRole: string;
  children: React.ReactNode;
}

export function AdminSidebar({ initialRole, children }: AdminSidebarProps) {
  const pathname = usePathname() ?? '';
  const { can } = usePermissions();

  // Optimistic filter: while client-side permissions hook is still loading, fall
  // back to the server-known role using the static role->permission map. This
  // avoids the menu briefly hiding items on first paint.
  const filteredItems = adminNavItems.filter((item) => {
    if (!item.permission) return true;
    // Try the live (RBAC + legacy) checker first; if it returns false we still
    // trust the server role for legacy admin/system_admin (they get everything).
    if (can(item.permission)) return true;
    return initialRole === 'system_admin' || initialRole === 'admin';
  });

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
      <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}

export default AdminSidebar;
