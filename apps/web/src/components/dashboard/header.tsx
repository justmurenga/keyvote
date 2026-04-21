'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Vote, Bell, Menu, User, LogOut, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

interface DashboardHeaderProps {
  user: {
    full_name: string | null;
    role: string | null;
  } | null;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      // Clear both Supabase session and custom OTP session cookie
      await fetch('/api/auth/logout', { method: 'POST' });
      await supabase.auth.signOut();
      // Hard redirect to ensure all auth state is cleared
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const fullName = user?.full_name?.trim() || 'User';

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation menu"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('myvote:toggle-sidebar'));
              }
            }}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Vote className="h-8 w-8 text-primary" />
            <span className="font-bold hidden sm:inline">myVote Kenya</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role || 'Voter'}
                </p>
              </div>
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-background shadow-lg z-50">
                  <div className="p-2">
                    <div className="px-3 py-2 border-b mb-2">
                      <p className="font-medium">{fullName}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {user?.role || 'Voter'}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted"
                      onClick={() => setShowMenu(false)}
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted"
                      onClick={() => setShowMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 w-full text-left text-red-600 dark:text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
