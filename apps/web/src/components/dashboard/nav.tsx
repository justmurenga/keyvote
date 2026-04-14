'use client';

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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
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
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, roles: ['candidate', 'admin', 'system_admin'] },
  { href: '/dashboard/agents', label: 'Agents', icon: Shield, roles: ['candidate', 'admin', 'system_admin'] },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText, roles: ['candidate', 'admin', 'system_admin'] },
  { href: '/dashboard/admin/polls', label: 'Manage Polls', icon: ClipboardList, roles: ['admin', 'system_admin', 'party_admin'] },
  { href: '/dashboard/admin/poll-analytics', label: 'Poll Analytics', icon: PieChart, roles: ['admin', 'system_admin', 'party_admin'] },
  { href: '/dashboard/admin/users', label: 'Manage Users', icon: UserCog, roles: ['admin', 'system_admin'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface DashboardNavProps {
  role: string;
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-background h-[calc(100vh-64px)] sticky top-16">
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
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
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="rounded-lg bg-primary/10 p-4">
          <p className="text-sm font-medium">Need help?</p>
          <p className="text-xs text-muted-foreground mt-1">
            USSD: *123# | WhatsApp: +254 700 000 000
          </p>
        </div>
      </div>
    </aside>
  );
}
