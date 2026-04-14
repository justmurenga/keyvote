'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, User, Bell, Shield, Smartphone, Moon, Sun, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardSettingsPage() {
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; phone: string; email: string | null; is_verified: boolean } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
        }
      } catch {
        // Silently fail
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <p className="text-muted-foreground">{profile?.full_name || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <p className="text-muted-foreground">{profile?.phone || 'Not set'}</p>
              </div>
            </div>
            <Link href="/dashboard/profile">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>How you want to receive updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via SMS (charges apply)</p>
              </div>
              <Button 
                variant={smsNotifications ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSmsNotifications(!smsNotifications)}
              >
                {smsNotifications ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">WhatsApp Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via WhatsApp</p>
              </div>
              <Button 
                variant={whatsappNotifications ? 'default' : 'outline'}
                size="sm"
                onClick={() => setWhatsappNotifications(!whatsappNotifications)}
              >
                {whatsappNotifications ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Button 
                variant={emailNotifications ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailNotifications(!emailNotifications)}
              >
                {emailNotifications ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Secure your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Phone Verification</p>
                <p className="text-sm text-muted-foreground">Your phone is verified</p>
              </div>
              <Badge variant="success">Verified</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add extra security to your account</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
          </CardContent>
        </Card>

        {/* USSD Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              USSD Access
            </CardTitle>
            <CardDescription>Access myVote via USSD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="font-mono text-lg text-center">*384*VOTE#</p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Dial this code on any phone to access myVote Kenya
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
