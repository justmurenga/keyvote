'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Bell, Shield, Smartphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_verified: boolean;
}

const NOTIF_PREFS_KEY = 'myvote.notificationPrefs.v1';

export default function DashboardSettingsPage() {
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load notification preferences from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(NOTIF_PREFS_KEY) : null;
      if (raw) {
        const prefs = JSON.parse(raw);
        if (typeof prefs.sms === 'boolean') setSmsNotifications(prefs.sms);
        if (typeof prefs.whatsapp === 'boolean') setWhatsappNotifications(prefs.whatsapp);
        if (typeof prefs.email === 'boolean') setEmailNotifications(prefs.email);
      }
    } catch {
      // ignore
    }
  }, []);

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
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const persistPrefs = (next: { sms?: boolean; whatsapp?: boolean; email?: boolean }) => {
    try {
      const merged = {
        sms: next.sms ?? smsNotifications,
        whatsapp: next.whatsapp ?? whatsappNotifications,
        email: next.email ?? emailNotifications,
      };
      window.localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  };

  const hasPhone = Boolean(profile?.phone);
  const hasEmail = Boolean(profile?.email);
  const isPhoneVerified = hasPhone && Boolean(profile?.is_verified);

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
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-muted-foreground">{profile?.full_name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <p className="text-muted-foreground">
                    {profile?.phone || 'Not set'}
                    {hasPhone && isPhoneVerified && (
                      <Badge variant="success" className="ml-2">Verified</Badge>
                    )}
                    {hasPhone && !isPhoneVerified && (
                      <Badge variant="outline" className="ml-2">Unverified</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <p className="text-muted-foreground">{profile?.email || 'Not set'}</p>
                </div>
              </div>
            )}
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
                <p className="text-sm text-muted-foreground">
                  {hasPhone
                    ? 'Receive updates via SMS (charges apply)'
                    : 'Add a phone number to enable SMS notifications'}
                </p>
              </div>
              <Button
                variant={hasPhone && smsNotifications ? 'default' : 'outline'}
                size="sm"
                disabled={!hasPhone}
                onClick={() => {
                  const next = !smsNotifications;
                  setSmsNotifications(next);
                  persistPrefs({ sms: next });
                }}
              >
                {hasPhone && smsNotifications ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">WhatsApp Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {hasPhone
                    ? 'Receive updates via WhatsApp'
                    : 'Add a phone number to enable WhatsApp notifications'}
                </p>
              </div>
              <Button
                variant={hasPhone && whatsappNotifications ? 'default' : 'outline'}
                size="sm"
                disabled={!hasPhone}
                onClick={() => {
                  const next = !whatsappNotifications;
                  setWhatsappNotifications(next);
                  persistPrefs({ whatsapp: next });
                }}
              >
                {hasPhone && whatsappNotifications ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {hasEmail
                    ? 'Receive updates via email'
                    : 'Add an email address to enable email notifications'}
                </p>
              </div>
              <Button
                variant={hasEmail && emailNotifications ? 'default' : 'outline'}
                size="sm"
                disabled={!hasEmail}
                onClick={() => {
                  const next = !emailNotifications;
                  setEmailNotifications(next);
                  persistPrefs({ email: next });
                }}
              >
                {hasEmail && emailNotifications ? 'Enabled' : 'Disabled'}
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
                <p className="text-sm text-muted-foreground">
                  {!hasPhone
                    ? 'No phone number on file'
                    : isPhoneVerified
                      ? 'Your phone is verified'
                      : 'Your phone number is not verified yet'}
                </p>
              </div>
              {!hasPhone ? (
                <Link href="/dashboard/profile">
                  <Button variant="outline" size="sm">Add Phone</Button>
                </Link>
              ) : isPhoneVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Link href="/dashboard/profile">
                  <Button variant="outline" size="sm">Verify</Button>
                </Link>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add extra security to your account</p>
              </div>
              <Badge variant="outline">Coming soon</Badge>
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
