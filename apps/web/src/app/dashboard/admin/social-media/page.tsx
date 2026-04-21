'use client';

import { useState, useEffect } from 'react';
import { Facebook, Instagram, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface SocialMediaSettings {
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  supportEmail: string;
  supportPhone: string;
  whatsappPhone: string;
  ussdCode: string;
}

export default function AdminSocialMediaSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<SocialMediaSettings>({
    facebookUrl: 'https://facebook.com/myvotekenya',
    instagramUrl: 'https://instagram.com/myvotekenya',
    tiktokUrl: 'https://tiktok.com/@myvotekenya',
    supportEmail: 'support@keyvote.online',
    supportPhone: '+254 733 638 940',
    whatsappPhone: '+254 733 638 940',
    ussdCode: '*384*VOTE#',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/general');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings({
            facebookUrl: data.settings.facebookUrl || '',
            instagramUrl: data.settings.instagramUrl || '',
            tiktokUrl: data.settings.tiktokUrl || '',
            supportEmail: data.settings.supportEmail || '',
            supportPhone: data.settings.supportPhone || '',
            whatsappPhone: data.settings.whatsappPhone || '',
            ussdCode: data.settings.ussdCode || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/general', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Social media settings updated successfully',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof SocialMediaSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Media Settings</h1>
        <p className="text-muted-foreground">
          Manage your platform's social media links and contact information
        </p>
      </div>

      <div className="grid gap-6">
        {/* Social Media Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5" />
              Social Media Links
            </CardTitle>
            <CardDescription>
              These links appear in the website footer and are used for social sharing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facebookUrl">Facebook Page URL</Label>
              <div className="flex gap-2">
                <Input
                  id="facebookUrl"
                  placeholder="https://facebook.com/myvotekenya"
                  value={settings.facebookUrl}
                  onChange={(e) => handleInputChange('facebookUrl', e.target.value)}
                />
                {settings.facebookUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(settings.facebookUrl, '_blank')}
                  >
                    Test
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your Facebook business page URL (e.g., facebook.com/myvotekenya)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagramUrl">Instagram Profile URL</Label>
              <div className="flex gap-2">
                <Input
                  id="instagramUrl"
                  placeholder="https://instagram.com/myvotekenya"
                  value={settings.instagramUrl}
                  onChange={(e) => handleInputChange('instagramUrl', e.target.value)}
                />
                {settings.instagramUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(settings.instagramUrl, '_blank')}
                  >
                    Test
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your Instagram profile URL (e.g., instagram.com/myvotekenya)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokUrl">TikTok Profile URL</Label>
              <div className="flex gap-2">
                <Input
                  id="tiktokUrl"
                  placeholder="https://tiktok.com/@myvotekenya"
                  value={settings.tiktokUrl}
                  onChange={(e) => handleInputChange('tiktokUrl', e.target.value)}
                />
                {settings.tiktokUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(settings.tiktokUrl, '_blank')}
                  >
                    Test
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your TikTok profile URL (e.g., tiktok.com/@myvotekenya)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Contact details displayed throughout the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                placeholder="support@keyvote.online"
                value={settings.supportEmail}
                onChange={(e) => handleInputChange('supportEmail', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportPhone">Support Phone</Label>
              <Input
                id="supportPhone"
                type="tel"
                placeholder="+254 733 638 940"
                value={settings.supportPhone}
                onChange={(e) => handleInputChange('supportPhone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappPhone">WhatsApp Number</Label>
              <Input
                id="whatsappPhone"
                type="tel"
                placeholder="+254 733 638 940"
                value={settings.whatsappPhone}
                onChange={(e) => handleInputChange('whatsappPhone', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +254 for Kenya)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ussdCode">USSD Code</Label>
              <Input
                id="ussdCode"
                placeholder="*384*VOTE#"
                value={settings.ussdCode}
                onChange={(e) => handleInputChange('ussdCode', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The USSD shortcode for accessing the platform
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How your social media links will appear</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              )}
              {settings.tiktokUrl && (
                <a
                  href={settings.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="TikTok"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </a>
              )}
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <p><strong>Support Email:</strong> {settings.supportEmail}</p>
              <p><strong>Support Phone:</strong> {settings.supportPhone}</p>
              <p><strong>WhatsApp:</strong> {settings.whatsappPhone}</p>
              <p><strong>USSD:</strong> {settings.ussdCode}</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
