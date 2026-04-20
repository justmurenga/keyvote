'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Save, CheckCircle2, Loader2,
  MessageSquare, Eye, Crown, Phone, DollarSign,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface ServicePrice {
  type: string;
  amount: number;
  description: string;
  currency: string;
}

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadPricing() {
      try {
        const res = await fetch('/api/wallet/charge');
        if (res.ok) {
          const data = await res.json();
          setPricing(data.pricing || []);
        }
      } catch (error) {
        console.error('Failed to load pricing:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPricing();
  }, []);

  const handlePriceChange = (index: number, newAmount: string) => {
    setPricing(prev => prev.map((p, i) =>
      i === index ? { ...p, amount: parseFloat(newAmount) || 0 } : p
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess('Pricing updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save pricing:', error);
    } finally {
      setSaving(false);
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'sms': return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'whatsapp': return <Phone className="h-5 w-5 text-green-500" />;
      case 'poll_view': return <Eye className="h-5 w-5 text-purple-500" />;
      case 'result_view': return <Eye className="h-5 w-5 text-orange-500" />;
      case 'subscription': return <Crown className="h-5 w-5 text-yellow-500" />;
      default: return <DollarSign className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatServiceName = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PermissionGuard permission="settings:system" fallback={
      <div className="text-center py-12">
        <p className="text-muted-foreground">You don&apos;t have permission to manage pricing.</p>
      </div>
    }>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Service Pricing</h1>
            <p className="text-muted-foreground mt-1">
              Set pricing for all billable services in the platform
            </p>
          </div>
          {success && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {success}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Billable Services
            </CardTitle>
            <CardDescription>
              Configure the amount charged (in KES) for each service when users access them through the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pricing.map((service, index) => (
                <div key={service.type} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getServiceIcon(service.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{formatServiceName(service.type)}</div>
                    <div className="text-sm text-muted-foreground">{service.description}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">KES</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={service.amount}
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      className="w-24 text-right"
                    />
                  </div>
                </div>
              ))}
            </div>

            {pricing.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No services found. Pricing is configured in the system.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Pricing'}
          </Button>
        </div>
      </div>
    </PermissionGuard>
  );
}
