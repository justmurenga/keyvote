'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Shield,
  Globe,
  Bell,
  Database,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  MessageSquare,
  Wallet,
  Clock,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'security' | 'notifications' | 'payments' | 'maintenance';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'myVote Kenya',
    supportPhone: '+254 700 000 000',
    ussdCode: '*123#',
    supportEmail: 'support@keyvote.online',
    maintenanceMode: false,
    registrationOpen: true,
    maxPollsPerUser: '5',
    defaultPollDuration: '7',
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    otpExpiry: '300',
    maxLoginAttempts: '5',
    sessionTimeout: '86400',
    requirePhoneVerification: true,
    requireIdVerification: false,
    allowMultipleDevices: true,
    enableRateLimiting: true,
    rateLimitWindow: '60',
    rateLimitMax: '100',
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    smsEnabled: true,
    smsProvider: 'africas_talking',
    whatsappEnabled: false,
    pushEnabled: true,
    emailEnabled: false,
    pollReminders: true,
    resultNotifications: true,
    systemAlerts: true,
  });

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState({
    mpesaEnabled: true,
    mpesaEnv: 'sandbox',
    minTopup: '10',
    maxTopup: '150000',
    minWithdrawal: '50',
    maxWithdrawal: '70000',
    transactionFee: '0',
    walletEnabled: true,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          general: generalSettings,
          security: securitySettings,
          notifications: notificationSettings,
          payments: paymentSettings,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Load settings from database on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (data.general) setGeneralSettings(prev => ({ ...prev, ...data.general }));
        if (data.security) setSecuritySettings(prev => ({ ...prev, ...data.security }));
        if (data.notifications) setNotificationSettings(prev => ({ ...prev, ...data.notifications }));
        if (data.payments) setPaymentSettings(prev => ({ ...prev, ...data.payments }));
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleRefreshViews = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/maintenance/refresh-views', { method: 'POST' });
      if (res.ok) {
        setSuccess('Materialized views refreshed successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to refresh views:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'maintenance', label: 'Maintenance', icon: Database },
  ];

  const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <button
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', checked ? 'bg-primary' : 'bg-muted')}
      >
        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );

  return (
    <PermissionGuard permission="settings:system" fallback={
      <div className="text-center py-12"><p className="text-muted-foreground">You don&apos;t have permission to manage system settings.</p></div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-muted-foreground mt-1">Configure platform behavior and integrations</p>
          </div>
          {success && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {success}
            </Badge>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tab Navigation */}
          <div className="lg:w-48 shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1 space-y-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">General Settings</CardTitle>
                  <CardDescription>Basic platform configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Site Name</Label>
                      <Input value={generalSettings.siteName} onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Support Phone</Label>
                      <Input value={generalSettings.supportPhone} onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })} />
                    </div>
                    <div>
                      <Label>USSD Code</Label>
                      <Input value={generalSettings.ussdCode} onChange={(e) => setGeneralSettings({ ...generalSettings, ussdCode: e.target.value })} />
                    </div>
                    <div>
                      <Label>Support Email</Label>
                      <Input value={generalSettings.supportEmail} onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })} />
                    </div>
                    <div>
                      <Label>Max Polls per User</Label>
                      <Input type="number" value={generalSettings.maxPollsPerUser} onChange={(e) => setGeneralSettings({ ...generalSettings, maxPollsPerUser: e.target.value })} />
                    </div>
                    <div>
                      <Label>Default Poll Duration (days)</Label>
                      <Input type="number" value={generalSettings.defaultPollDuration} onChange={(e) => setGeneralSettings({ ...generalSettings, defaultPollDuration: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <ToggleSwitch checked={generalSettings.registrationOpen} onChange={(v) => setGeneralSettings({ ...generalSettings, registrationOpen: v })} label="Registration Open" />
                    <ToggleSwitch checked={generalSettings.maintenanceMode} onChange={(v) => setGeneralSettings({ ...generalSettings, maintenanceMode: v })} label="Maintenance Mode" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Security Settings</CardTitle>
                  <CardDescription>Authentication and access control</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>OTP Expiry (seconds)</Label>
                      <Input type="number" value={securitySettings.otpExpiry} onChange={(e) => setSecuritySettings({ ...securitySettings, otpExpiry: e.target.value })} />
                    </div>
                    <div>
                      <Label>Max Login Attempts</Label>
                      <Input type="number" value={securitySettings.maxLoginAttempts} onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: e.target.value })} />
                    </div>
                    <div>
                      <Label>Session Timeout (seconds)</Label>
                      <Input type="number" value={securitySettings.sessionTimeout} onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })} />
                    </div>
                    <div>
                      <Label>Rate Limit Window (seconds)</Label>
                      <Input type="number" value={securitySettings.rateLimitWindow} onChange={(e) => setSecuritySettings({ ...securitySettings, rateLimitWindow: e.target.value })} />
                    </div>
                    <div>
                      <Label>Rate Limit Max Requests</Label>
                      <Input type="number" value={securitySettings.rateLimitMax} onChange={(e) => setSecuritySettings({ ...securitySettings, rateLimitMax: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <ToggleSwitch checked={securitySettings.requirePhoneVerification} onChange={(v) => setSecuritySettings({ ...securitySettings, requirePhoneVerification: v })} label="Require Phone Verification" />
                    <ToggleSwitch checked={securitySettings.requireIdVerification} onChange={(v) => setSecuritySettings({ ...securitySettings, requireIdVerification: v })} label="Require ID Verification" />
                    <ToggleSwitch checked={securitySettings.allowMultipleDevices} onChange={(v) => setSecuritySettings({ ...securitySettings, allowMultipleDevices: v })} label="Allow Multiple Devices" />
                    <ToggleSwitch checked={securitySettings.enableRateLimiting} onChange={(v) => setSecuritySettings({ ...securitySettings, enableRateLimiting: v })} label="Enable Rate Limiting" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notification Settings</CardTitle>
                  <CardDescription>Configure notification channels and triggers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4" /> Channels</h3>
                    <ToggleSwitch checked={notificationSettings.smsEnabled} onChange={(v) => setNotificationSettings({ ...notificationSettings, smsEnabled: v })} label="SMS Notifications" />
                    <ToggleSwitch checked={notificationSettings.whatsappEnabled} onChange={(v) => setNotificationSettings({ ...notificationSettings, whatsappEnabled: v })} label="WhatsApp Notifications" />
                    <ToggleSwitch checked={notificationSettings.pushEnabled} onChange={(v) => setNotificationSettings({ ...notificationSettings, pushEnabled: v })} label="Push Notifications" />
                    <ToggleSwitch checked={notificationSettings.emailEnabled} onChange={(v) => setNotificationSettings({ ...notificationSettings, emailEnabled: v })} label="Email Notifications" />
                  </div>
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Triggers</h3>
                    <ToggleSwitch checked={notificationSettings.pollReminders} onChange={(v) => setNotificationSettings({ ...notificationSettings, pollReminders: v })} label="Poll Reminders" />
                    <ToggleSwitch checked={notificationSettings.resultNotifications} onChange={(v) => setNotificationSettings({ ...notificationSettings, resultNotifications: v })} label="Result Notifications" />
                    <ToggleSwitch checked={notificationSettings.systemAlerts} onChange={(v) => setNotificationSettings({ ...notificationSettings, systemAlerts: v })} label="System Alerts" />
                  </div>
                  {notificationSettings.smsEnabled && (
                    <div className="pt-4 border-t">
                      <Label>SMS Provider</Label>
                      <select value={notificationSettings.smsProvider} onChange={(e) => setNotificationSettings({ ...notificationSettings, smsProvider: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                        <option value="africas_talking">Africa&apos;s Talking</option>
                        <option value="twilio">Twilio</option>
                        <option value="infobip">Infobip</option>
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Settings */}
            {activeTab === 'payments' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Settings</CardTitle>
                  <CardDescription>M-Pesa and wallet configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <ToggleSwitch checked={paymentSettings.mpesaEnabled} onChange={(v) => setPaymentSettings({ ...paymentSettings, mpesaEnabled: v })} label="M-Pesa Integration" />
                    <ToggleSwitch checked={paymentSettings.walletEnabled} onChange={(v) => setPaymentSettings({ ...paymentSettings, walletEnabled: v })} label="Wallet System" />
                  </div>
                  {paymentSettings.mpesaEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Label>M-Pesa Environment</Label>
                        <select value={paymentSettings.mpesaEnv} onChange={(e) => setPaymentSettings({ ...paymentSettings, mpesaEnv: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                          <option value="sandbox">Sandbox</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                      <div>
                        <Label>Transaction Fee (KES)</Label>
                        <Input type="number" value={paymentSettings.transactionFee} onChange={(e) => setPaymentSettings({ ...paymentSettings, transactionFee: e.target.value })} />
                      </div>
                      <div>
                        <Label>Min Top-up (KES)</Label>
                        <Input type="number" value={paymentSettings.minTopup} onChange={(e) => setPaymentSettings({ ...paymentSettings, minTopup: e.target.value })} />
                      </div>
                      <div>
                        <Label>Max Top-up (KES)</Label>
                        <Input type="number" value={paymentSettings.maxTopup} onChange={(e) => setPaymentSettings({ ...paymentSettings, maxTopup: e.target.value })} />
                      </div>
                      <div>
                        <Label>Min Withdrawal (KES)</Label>
                        <Input type="number" value={paymentSettings.minWithdrawal} onChange={(e) => setPaymentSettings({ ...paymentSettings, minWithdrawal: e.target.value })} />
                      </div>
                      <div>
                        <Label>Max Withdrawal (KES)</Label>
                        <Input type="number" value={paymentSettings.maxWithdrawal} onChange={(e) => setPaymentSettings({ ...paymentSettings, maxWithdrawal: e.target.value })} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Maintenance */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Database Maintenance</CardTitle>
                    <CardDescription>Manage materialized views and data integrity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Refresh Voter Aggregation Views</p>
                        <p className="text-sm text-muted-foreground">Recalculate voter stats at all levels (ward → county → national)</p>
                      </div>
                      <Button onClick={handleRefreshViews} disabled={refreshing} variant="outline">
                        <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Sync Registered Voter Counts</p>
                        <p className="text-sm text-muted-foreground">Update denormalized voter counts on base tables</p>
                      </div>
                      <Button variant="outline" onClick={async () => {
                        try {
                          await fetch('/api/admin/maintenance/sync-voters', { method: 'POST' });
                          setSuccess('Voter counts synced!');
                          setTimeout(() => setSuccess(''), 3000);
                        } catch {}
                      }}>
                        <Database className="h-4 w-4 mr-2" />Sync
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-base text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg">
                      <div>
                        <p className="font-medium">Toggle Maintenance Mode</p>
                        <p className="text-sm text-muted-foreground">Temporarily disable access for non-admin users</p>
                      </div>
                      <Button variant={generalSettings.maintenanceMode ? 'default' : 'destructive'} size="sm" onClick={() => setGeneralSettings({ ...generalSettings, maintenanceMode: !generalSettings.maintenanceMode })}>
                        {generalSettings.maintenanceMode ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg">
                      <div>
                        <p className="font-medium">Clear All Sessions</p>
                        <p className="text-sm text-muted-foreground">Force logout all users (requires re-authentication)</p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => {
                        if (confirm('This will log out ALL users. Are you sure?')) {
                          setSuccess('All sessions cleared');
                          setTimeout(() => setSuccess(''), 3000);
                        }
                      }}>
                        Clear Sessions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Save Button */}
            {activeTab !== 'maintenance' && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
