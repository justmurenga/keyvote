'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  UserPlus,
  MapPin,
  Building2,
  FileText,
  Globe,
  AlertCircle,
} from 'lucide-react';

interface County {
  id: string;
  name: string;
}

interface Constituency {
  id: string;
  name: string;
  county_id: string;
}

interface Ward {
  id: string;
  name: string;
  constituency_id: string;
}

interface Party {
  id: string;
  name: string;
  abbreviation: string;
}

const POSITIONS = [
  { value: 'president', label: 'President', level: 'National', description: 'Head of State and Government' },
  { value: 'governor', label: 'Governor', level: 'County', description: 'Head of County Government' },
  { value: 'senator', label: 'Senator', level: 'County', description: 'County representative in Senate' },
  { value: 'women_rep', label: "Women's Representative", level: 'County', description: 'County Women Representative in National Assembly' },
  { value: 'mp', label: 'Member of Parliament', level: 'Constituency', description: 'Constituency representative in National Assembly' },
  { value: 'mca', label: 'Member of County Assembly', level: 'Ward', description: 'Ward representative in County Assembly' },
];

const STEPS = [
  { id: 1, label: 'Position', icon: UserPlus },
  { id: 2, label: 'Region', icon: MapPin },
  { id: 3, label: 'Party', icon: Building2 },
  { id: 4, label: 'Profile', icon: FileText },
  { id: 5, label: 'Social', icon: Globe },
];

export default function BecomeACandidatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form data
  const [position, setPosition] = useState('');
  const [countyId, setCountyId] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [wardId, setWardId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [isIndependent, setIsIndependent] = useState(false);
  const [campaignSlogan, setCampaignSlogan] = useState('');
  const [manifestoText, setManifestoText] = useState('');
  const [campaignVideoUrl, setCampaignVideoUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');

  // Reference data
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);

  // Load counties on mount
  useEffect(() => {
    fetchCounties();
    fetchParties();
  }, []);

  // Load constituencies when county changes
  useEffect(() => {
    if (countyId) {
      fetchConstituencies(countyId);
      setConstituencyId('');
      setWardId('');
    }
  }, [countyId]);

  // Load wards when constituency changes
  useEffect(() => {
    if (constituencyId) {
      fetchWards(constituencyId);
      setWardId('');
    }
  }, [constituencyId]);

  const fetchCounties = async () => {
    try {
      const res = await fetch('/api/regions?type=counties');
      if (res.ok) {
        const data = await res.json();
        setCounties(data.regions || data.counties || data || []);
      }
    } catch (e) {
      console.error('Failed to fetch counties:', e);
    }
  };

  const fetchConstituencies = async (county: string) => {
    setLoadingRegions(true);
    try {
      const res = await fetch(`/api/regions?type=constituencies&parentId=${county}`);
      if (res.ok) {
        const data = await res.json();
        setConstituencies(data.regions || data.constituencies || data || []);
      }
    } catch (e) {
      console.error('Failed to fetch constituencies:', e);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchWards = async (constituency: string) => {
    setLoadingRegions(true);
    try {
      const res = await fetch(`/api/regions?type=wards&parentId=${constituency}`);
      if (res.ok) {
        const data = await res.json();
        setWards(data.regions || data.wards || data || []);
      }
    } catch (e) {
      console.error('Failed to fetch wards:', e);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchParties = async () => {
    try {
      const res = await fetch('/api/parties');
      if (res.ok) {
        const data = await res.json();
        setParties(data.parties || data || []);
      }
    } catch (e) {
      console.error('Failed to fetch parties:', e);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!position;
      case 2:
        if (position === 'president') return true;
        if (['governor', 'senator', 'women_rep'].includes(position)) return !!countyId;
        if (position === 'mp') return !!constituencyId;
        if (position === 'mca') return !!wardId;
        return false;
      case 3:
        return isIndependent || !!partyId;
      case 4:
        return true; // Profile details are optional
      case 5:
        return true; // Social links are optional
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        position,
        county_id: ['governor', 'senator', 'women_rep'].includes(position) ? countyId : null,
        constituency_id: position === 'mp' ? constituencyId : null,
        ward_id: position === 'mca' ? wardId : null,
        party_id: isIndependent ? null : partyId || null,
        is_independent: isIndependent,
        campaign_slogan: campaignSlogan || null,
        manifesto_text: manifestoText || null,
        campaign_video_url: campaignVideoUrl || null,
        facebook_url: facebookUrl || null,
        twitter_url: twitterUrl || null,
        instagram_url: instagramUrl || null,
        tiktok_url: tiktokUrl || null,
      };

      const res = await fetch('/api/candidates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setSuccess(true);
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-200">
              Application Submitted!
            </h2>
            <p className="text-green-700 dark:text-green-300 max-w-md mx-auto">
              Your candidate profile has been created successfully.
              Our admin team will review and verify your profile shortly.
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={() => router.push('/dashboard/candidate')}>
                Go to Candidate Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold mt-2">Become a Candidate</h1>
        <p className="text-muted-foreground">
          Register as a candidate to start your campaign on myVote Kenya
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step > s.id
                    ? 'bg-green-500 text-white'
                    : step === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.id ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className={`text-xs mt-1 ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-16 mx-1 ${
                  step > s.id ? 'bg-green-500' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: Position Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Your Position</CardTitle>
            <CardDescription>
              Choose the electoral position you are vying for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => {
                    setPosition(pos.value);
                    // Reset region when position changes
                    setCountyId('');
                    setConstituencyId('');
                    setWardId('');
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    position === pos.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{pos.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {pos.level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{pos.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Region Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Your Region</CardTitle>
            <CardDescription>
              {position === 'president'
                ? 'President is a national position — no region selection needed'
                : `Choose the ${
                    ['governor', 'senator', 'women_rep'].includes(position)
                      ? 'county'
                      : position === 'mp'
                      ? 'constituency'
                      : 'ward'
                  } you are vying in`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {position === 'president' ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  The presidential position covers all of Kenya. No region selection needed.
                </p>
              </div>
            ) : (
              <>
                {/* County Selector (for governor, senator, women_rep, and as parent for mp/mca) */}
                {(position !== 'president') && (
                  <div className="space-y-2">
                    <Label>County</Label>
                    <select
                      value={countyId}
                      onChange={(e) => setCountyId(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select a county...</option>
                      {counties.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Constituency Selector (for mp, and as parent for mca) */}
                {['mp', 'mca'].includes(position) && countyId && (
                  <div className="space-y-2">
                    <Label>Constituency</Label>
                    {loadingRegions ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading constituencies...
                      </div>
                    ) : (
                      <select
                        value={constituencyId}
                        onChange={(e) => setConstituencyId(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select a constituency...</option>
                        {constituencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Ward Selector (for mca) */}
                {position === 'mca' && constituencyId && (
                  <div className="space-y-2">
                    <Label>Ward</Label>
                    {loadingRegions ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading wards...
                      </div>
                    ) : (
                      <select
                        value={wardId}
                        onChange={(e) => setWardId(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select a ward...</option>
                        {wards.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Party Affiliation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Party Affiliation</CardTitle>
            <CardDescription>
              Select your political party or declare as an independent candidate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsIndependent(false);
                  setPartyId('');
                }}
                className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
                  !isIndependent
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Building2 className="h-6 w-6 mx-auto mb-2" />
                <span className="font-medium">Party Candidate</span>
              </button>
              <button
                onClick={() => {
                  setIsIndependent(true);
                  setPartyId('');
                }}
                className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
                  isIndependent
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <UserPlus className="h-6 w-6 mx-auto mb-2" />
                <span className="font-medium">Independent</span>
              </button>
            </div>

            {!isIndependent && (
              <div className="space-y-2">
                <Label>Select Political Party</Label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Choose a party...</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.abbreviation})
                    </option>
                  ))}
                </select>
                {parties.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No parties available. You can declare as independent.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Campaign Profile */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Profile</CardTitle>
            <CardDescription>
              Tell voters about yourself and your campaign (you can update these later)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slogan">Campaign Slogan</Label>
              <Input
                id="slogan"
                placeholder="e.g., Together for a better tomorrow"
                value={campaignSlogan}
                onChange={(e) => setCampaignSlogan(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{campaignSlogan.length}/500 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manifesto">Manifesto</Label>
              <Textarea
                id="manifesto"
                placeholder="Share your vision, plans, and promises to the electorate..."
                value={manifestoText}
                onChange={(e) => setManifestoText(e.target.value)}
                rows={8}
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground">{manifestoText.length}/5000 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">Campaign Video URL</Label>
              <Input
                id="video"
                placeholder="https://youtube.com/watch?v=..."
                value={campaignVideoUrl}
                onChange={(e) => setCampaignVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">YouTube or other video link</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Social Media Links */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
            <CardDescription>
              Connect your social media accounts (optional, can be added later)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                placeholder="https://facebook.com/yourpage"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter / X</Label>
              <Input
                id="twitter"
                placeholder="https://twitter.com/yourhandle"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="https://instagram.com/yourprofile"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                placeholder="https://tiktok.com/@yourprofile"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {step < 5 ? (
          <Button
            onClick={() => {
              setError('');
              setStep((s) => s + 1);
            }}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
