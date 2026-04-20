'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  FileText,
  User,
} from 'lucide-react';

interface CandidateProfile {
  id: string;
  position: string;
  campaign_slogan: string | null;
  manifesto_text: string | null;
  manifesto_pdf_url: string | null;
  campaign_video_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  is_verified: boolean;
  is_independent: boolean;
  user: {
    full_name: string;
    phone: string;
    profile_photo_url: string | null;
  };
  party: { name: string; abbreviation: string } | null;
  county: { name: string } | null;
  constituency: { name: string } | null;
  ward: { name: string } | null;
}

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Representative",
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

export default function CandidateProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);

  // Form fields
  const [campaignSlogan, setCampaignSlogan] = useState('');
  const [manifestoText, setManifestoText] = useState('');
  const [campaignVideoUrl, setCampaignVideoUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/candidates/me');
      if (res.ok) {
        const data = await res.json();
        const c = data.candidate;
        setCandidate(c);
        setCampaignSlogan(c.campaign_slogan || '');
        setManifestoText(c.manifesto_text || '');
        setCampaignVideoUrl(c.campaign_video_url || '');
        setFacebookUrl(c.facebook_url || '');
        setTwitterUrl(c.twitter_url || '');
        setInstagramUrl(c.instagram_url || '');
        setTiktokUrl(c.tiktok_url || '');
      } else {
        setError('Could not load profile');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/candidates/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_slogan: campaignSlogan || null,
          manifesto_text: manifestoText || null,
          campaign_video_url: campaignVideoUrl || null,
          facebook_url: facebookUrl || null,
          twitter_url: twitterUrl || null,
          instagram_url: instagramUrl || null,
          tiktok_url: tiktokUrl || null,
        }),
      });

      if (res.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <p>{error || 'No candidate profile found'}</p>
      </div>
    );
  }

  const region =
    candidate.county?.name ||
    candidate.constituency?.name ||
    candidate.ward?.name ||
    'National';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/candidate')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold mt-2">Edit Campaign Profile</h1>
        <p className="text-muted-foreground">
          Update your campaign information to engage with voters
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Read-only Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Candidate Information
          </CardTitle>
          <CardDescription>These fields cannot be changed here. Contact support for corrections.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Full Name</Label>
              <p className="font-medium">{candidate.user.full_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Position</Label>
              <p className="font-medium">{POSITION_LABELS[candidate.position]}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Region</Label>
              <p className="font-medium">{region}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Party</Label>
              <p className="font-medium">
                {candidate.party ? `${candidate.party.name} (${candidate.party.abbreviation})` : 'Independent'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Verification</Label>
              <div>
                {candidate.is_verified ? (
                  <Badge className="bg-green-100 text-green-800">Verified</Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-700">Pending</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Campaign Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slogan">Campaign Slogan</Label>
            <Input
              id="slogan"
              placeholder="Your campaign slogan..."
              value={campaignSlogan}
              onChange={(e) => setCampaignSlogan(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{campaignSlogan.length}/500</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manifesto">Manifesto</Label>
            <Textarea
              id="manifesto"
              placeholder="Your vision, plans, and promises..."
              value={manifestoText}
              onChange={(e) => setManifestoText(e.target.value)}
              rows={10}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">{manifestoText.length}/5000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Campaign Video URL</Label>
            <Input
              id="video"
              placeholder="https://youtube.com/watch?v=..."
              value={campaignVideoUrl}
              onChange={(e) => setCampaignVideoUrl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Social Media Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                placeholder="https://facebook.com/..."
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter / X</Label>
              <Input
                id="twitter"
                placeholder="https://twitter.com/..."
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="https://instagram.com/..."
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                placeholder="https://tiktok.com/@..."
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/dashboard/candidate')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
