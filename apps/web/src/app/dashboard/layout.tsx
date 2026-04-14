import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/dashboard/nav';
import { DashboardHeader } from '@/components/dashboard/header';

interface SessionData {
  userId: string;
  phone: string;
  fullName: string;
  role: string;
  expiresAt: number;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // Check Supabase auth first
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  // Check custom session cookie (from OTP login)
  const sessionCookie = cookieStore.get('myvote-session')?.value;
  let customSession: SessionData | null = null;
  
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie);
      if (session.expiresAt > Date.now()) {
        customSession = session;
      }
    } catch (e) {
      // Invalid session
    }
  }

  // No auth at all - redirect to login
  if (!supabaseUser && !customSession) {
    redirect('/auth/login');
  }

  // Get user profile based on which auth method is active
  let profile = null;
  
  if (supabaseUser) {
    const { data } = await supabase
      .from('users')
      .select('full_name, role')
      .eq('id', supabaseUser.id)
      .single();
    profile = data;
  } else if (customSession) {
    const { data } = await supabase
      .from('users')
      .select('full_name, role')
      .eq('id', customSession.userId)
      .single();
    profile = data;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader user={profile} />
      <div className="flex">
        <DashboardNav role={profile?.role || 'voter'} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
