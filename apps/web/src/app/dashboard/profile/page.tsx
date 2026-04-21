'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Pencil,
  Shield,
  Camera,
  Trash2,
  Megaphone,
  ScrollText,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PollingStationSelector } from '@/components/auth/polling-station-selector';
import { useToast } from '@/components/ui/use-toast';

// DB enum values (matching 0005_create_enums.sql)
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

const AGE_BRACKET_OPTIONS = [
  { value: '18-24', label: '18–24 years' },
  { value: '25-34', label: '25–34 years' },
  { value: '35-44', label: '35–44 years' },
  { value: '45-54', label: '45–54 years' },
  { value: '55-64', label: '55–64 years' },
  { value: '65+', label: '65+ years' },
] as const;

interface CandidateFields {
  id: string;
  position: string;
  party_id: string | null;
  is_independent: boolean;
  campaign_slogan: string | null;
  manifesto_text: string | null;
  manifesto_pdf_url: string | null;
  campaign_video_url: string | null;
  is_verified: boolean;
  verification_status: string | null;
}

interface ProfileData {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string;
  gender: string | null;
  age_bracket: string | null;
  id_number: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  role: string;
  is_verified: boolean;
  polling_station_id: string | null;
  ward_id: string | null;
  constituency_id: string | null;
  county_id: string | null;
  polling_station_name: string | null;
  ward_name: string | null;
  constituency_name: string | null;
  county_name: string | null;
  created_at: string;
  updated_at: string;
  candidate?: CandidateFields | null;
}

interface ProfileCompletion {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  isComplete: boolean;
  requiredFields?: string[];
  optionalFields?: string[];
}

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  phone: 'Phone Number',
  gender: 'Gender',
  age_bracket: 'Age Bracket',
  polling_station_id: 'Polling Station',
  email: 'Email Address',
  bio: 'Bio',
  profile_photo_url: 'Profile Photo',
  campaign_slogan: 'Campaign Slogan',
  manifesto_text: 'Manifesto',
  manifesto_pdf_url: 'Manifesto PDF',
  campaign_video_url: 'Campaign Video',
  party_or_independent: 'Party / Independent',
};

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showStationSelector, setShowStationSelector] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    gender: '',
    age_bracket: '',
    bio: '',
    polling_station_id: '',
  });
  const [pollingStationName, setPollingStationName] = useState('');

  // Candidate-specific form state (only used when role === 'candidate')
  const [candidateForm, setCandidateForm] = useState({
    campaign_slogan: '',
    manifesto_text: '',
    manifesto_pdf_url: '',
    campaign_video_url: '',
  });

  // Profile photo upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  // Phone verification flow state (used when the user signed up with email
  // and needs to add + verify a phone number to complete their profile).
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);

  // Email verification flow state (mirrors the phone flow above).
  const [emailInput, setEmailInput] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profile', { credentials: 'same-origin' });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      const data = await res.json();
      setProfile(data.profile);
      setCompletion(data.completion);

      // Pre-fill form
      setFormData({
        full_name: data.profile.full_name || '',
        email: data.profile.email?.endsWith('@myvote.ke')
          ? ''
          : data.profile.email || '',
        gender: data.profile.gender || '',
        age_bracket: data.profile.age_bracket || '',
        bio: data.profile.bio || '',
        polling_station_id: data.profile.polling_station_id || '',
      });
      setPollingStationName(data.profile.polling_station_name || '');

      // Pre-fill candidate-specific form when applicable
      if (data.profile.candidate) {
        setCandidateForm({
          campaign_slogan: data.profile.candidate.campaign_slogan || '',
          manifesto_text: data.profile.candidate.manifesto_text || '',
          manifesto_pdf_url: data.profile.candidate.manifesto_pdf_url || '',
          campaign_video_url: data.profile.candidate.campaign_video_url || '',
        });
      }

      // Auto-open edit mode if profile is incomplete
      if (!data.completion.isComplete) {
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build payload with only changed fields
      const payload: Record<string, unknown> = {};

      if (formData.full_name && formData.full_name !== profile?.full_name) {
        payload.full_name = formData.full_name;
      }
      if (formData.gender && formData.gender !== profile?.gender) {
        payload.gender = formData.gender;
      }
      if (formData.age_bracket && formData.age_bracket !== profile?.age_bracket) {
        payload.age_bracket = formData.age_bracket;
      }
      if (formData.bio !== (profile?.bio || '')) {
        payload.bio = formData.bio || null;
      }
      if (
        formData.polling_station_id &&
        formData.polling_station_id !== profile?.polling_station_id
      ) {
        payload.polling_station_id = formData.polling_station_id;
      }

      // Candidate-specific changes (saved through the candidate API)
      const isCandidate = profile?.role === 'candidate' && profile.candidate;
      const candidatePayload: Record<string, unknown> = {};
      if (isCandidate && profile?.candidate) {
        const c = profile.candidate;
        if (candidateForm.campaign_slogan !== (c.campaign_slogan || '')) {
          candidatePayload.campaign_slogan = candidateForm.campaign_slogan || null;
        }
        if (candidateForm.manifesto_text !== (c.manifesto_text || '')) {
          candidatePayload.manifesto_text = candidateForm.manifesto_text || null;
        }
        if (candidateForm.manifesto_pdf_url !== (c.manifesto_pdf_url || '')) {
          candidatePayload.manifesto_pdf_url = candidateForm.manifesto_pdf_url || null;
        }
        if (candidateForm.campaign_video_url !== (c.campaign_video_url || '')) {
          candidatePayload.campaign_video_url = candidateForm.campaign_video_url || null;
        }
      }

      if (
        Object.keys(payload).length === 0 &&
        Object.keys(candidatePayload).length === 0
      ) {
        toast({
          title: 'No changes',
          description: 'No changes were made to your profile.',
        });
        setIsEditing(false);
        return;
      }

      if (Object.keys(payload).length > 0) {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update profile');
        }
      }

      if (Object.keys(candidatePayload).length > 0) {
        const res = await fetch('/api/candidates/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(candidatePayload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update candidate profile');
        }
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });

      setIsEditing(false);
      // Re-fetch to get updated completion and location names
      await fetchProfile();
      // Refresh server components (e.g. dashboard layout/header) so they re-fetch the profile
      router.refresh();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePollingStationSelect = (stationId: string, stationName: string) => {
    setFormData((prev) => ({ ...prev, polling_station_id: stationId }));
    setPollingStationName(stationName);
  };

  const handleSendPhoneOtp = async () => {
    if (!phoneInput.trim()) {
      toast({
        title: 'Phone required',
        description: 'Please enter a phone number first.',
        variant: 'destructive',
      });
      return;
    }
    setIsSendingPhoneOtp(true);
    try {
      const res = await fetch('/api/profile/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ phone: phoneInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send code');
      }
      setPendingPhone(data.phone || phoneInput.trim());
      setPhoneOtpSent(true);
      toast({
        title: 'Code sent',
        description: `We sent a 6-digit code to ${data.phone || phoneInput.trim()}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Could not send code',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim() || phoneOtp.trim().length < 4) {
      toast({
        title: 'Code required',
        description: 'Please enter the verification code.',
        variant: 'destructive',
      });
      return;
    }
    setIsVerifyingPhoneOtp(true);
    try {
      const res = await fetch('/api/profile/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          phone: pendingPhone || phoneInput.trim(),
          otp: phoneOtp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }
      toast({
        title: 'Phone verified',
        description: 'Your phone number has been added to your profile.',
      });
      setPhoneInput('');
      setPhoneOtp('');
      setPhoneOtpSent(false);
      setPendingPhone('');
      await fetchProfile();
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!emailInput.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address first.',
        variant: 'destructive',
      });
      return;
    }
    setIsSendingEmailOtp(true);
    try {
      const res = await fetch('/api/profile/email/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send code');
      }
      setPendingEmail(data.email || emailInput.trim());
      setEmailOtpSent(true);
      toast({
        title: 'Code sent',
        description: `We sent a 6-digit code to ${data.email || emailInput.trim()}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Could not send code',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim() || emailOtp.trim().length < 4) {
      toast({
        title: 'Code required',
        description: 'Please enter the verification code.',
        variant: 'destructive',
      });
      return;
    }
    setIsVerifyingEmailOtp(true);
    try {
      const res = await fetch('/api/profile/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: pendingEmail || emailInput.trim(),
          otp: emailOtp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }
      toast({
        title: 'Email verified',
        description: 'Your email has been added to your profile.',
      });
      setEmailInput('');
      setEmailOtp('');
      setEmailOtpSent(false);
      setPendingEmail('');
      await fetchProfile();
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset input so the same file can be re-selected later
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Unsupported file',
        description: 'Please choose a JPEG, PNG, WEBP or GIF image.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Image too large',
        description: 'Choose an image that is 5 MB or smaller.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        credentials: 'same-origin',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }
      toast({
        title: 'Photo updated',
        description: 'Your profile photo has been updated.',
      });
      await fetchProfile();
      router.refresh();
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err.message || 'Could not upload photo. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.profile_photo_url) return;
    setIsRemovingPhoto(true);
    try {
      const res = await fetch('/api/profile/photo', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove photo');
      }
      toast({ title: 'Photo removed' });
      await fetchProfile();
      router.refresh();
    } catch (err: any) {
      toast({
        title: 'Could not remove photo',
        description: err.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
          <p className="text-muted-foreground">Could not load profile.</p>
          <Button onClick={fetchProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isAutoEmail = profile.email?.endsWith('@myvote.ke');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">
              {isEditing
                ? 'Complete your profile to get the most out of myVote'
                : 'View and manage your personal information'}
            </p>
          </div>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Completion Banner */}
      {completion && !completion.isComplete && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    Complete your profile
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Your profile is {completion.percentage}% complete. Fill in the
                    missing information to improve your experience.
                  </p>
                </div>
                <Progress value={completion.percentage} className="h-2" />
                <div className="flex flex-wrap gap-2">
                  {completion.missingFields.map((field) => (
                    <Badge
                      key={field}
                      variant="outline"
                      className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                    >
                      {FIELD_LABELS[field] || field}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Banner */}
      {completion && completion.isComplete && !isEditing && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Your profile is complete! All information is up to date.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? 'Update your personal details below'
                  : 'Your personal details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar + Name Section */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  {profile.profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.profile_photo_url}
                      alt={profile.full_name}
                      className="h-20 w-20 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleAvatarSelect}
                    disabled={isUploadingPhoto || isRemovingPhoto}
                    title="Change profile photo"
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow ring-2 ring-background hover:opacity-90 disabled:opacity-60"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  {isEditing ? (
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        placeholder="Your full name"
                        className="mt-1"
                      />
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold">{profile.full_name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {profile.role} • Joined{' '}
                        {new Date(profile.created_at).toLocaleDateString('en-KE', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarSelect}
                      disabled={isUploadingPhoto || isRemovingPhoto}
                    >
                      <Camera className="h-3.5 w-3.5 mr-1.5" />
                      {profile.profile_photo_url ? 'Change photo' : 'Upload photo'}
                    </Button>
                    {profile.profile_photo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingPhoto || isRemovingPhoto}
                        className="text-destructive hover:text-destructive"
                      >
                        {isRemovingPhoto ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG, WEBP or GIF • up to 5 MB
                  </p>
                </div>
              </div>

              <Separator />

              {/* Gender */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Gender
                    {!profile.gender && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Missing
                      </Badge>
                    )}
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <select
                        value={formData.gender}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            gender: e.target.value,
                          }))
                        }
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                      >
                        <option value="">Select gender</option>
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm">
                      {profile.gender
                        ? GENDER_OPTIONS.find((g) => g.value === profile.gender)
                            ?.label || profile.gender
                        : '—'}
                    </p>
                  )}
                </div>

                {/* Age Bracket */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Age Bracket
                    {!profile.age_bracket && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Missing
                      </Badge>
                    )}
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <select
                        value={formData.age_bracket}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            age_bracket: e.target.value,
                          }))
                        }
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                      >
                        <option value="">Select age bracket</option>
                        {AGE_BRACKET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm">
                      {profile.age_bracket
                        ? AGE_BRACKET_OPTIONS.find(
                            (a) => a.value === profile.age_bracket
                          )?.label || profile.age_bracket
                        : '—'}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                  {profile.email && !isAutoEmail ? (
                    <Badge variant="success" className="text-xs">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      Missing
                    </Badge>
                  )}
                </Label>
                {profile.email && !isAutoEmail ? (
                  <div>
                    <p className="text-sm font-medium">{profile.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Email address cannot be changed once verified.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Add and verify an email address to complete your profile and
                      enable email notifications.
                    </p>
                    {!emailOtpSent ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          type="email"
                          inputMode="email"
                          placeholder="your.email@example.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="sm:flex-1"
                          disabled={isSendingEmailOtp}
                        />
                        <Button
                          onClick={handleSendEmailOtp}
                          disabled={isSendingEmailOtp || !emailInput.trim()}
                        >
                          {isSendingEmailOtp ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send code'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          We sent a 6-digit code to{' '}
                          <span className="font-medium">{pendingEmail}</span>.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6-digit code"
                            value={emailOtp}
                            onChange={(e) =>
                              setEmailOtp(e.target.value.replace(/\D/g, ''))
                            }
                            className="sm:flex-1"
                            disabled={isVerifyingEmailOtp}
                          />
                          <Button
                            onClick={handleVerifyEmailOtp}
                            disabled={isVerifyingEmailOtp || emailOtp.length < 4}
                          >
                            {isVerifyingEmailOtp ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              'Verify & save'
                            )}
                          </Button>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <button
                            type="button"
                            className="text-primary hover:underline disabled:opacity-50"
                            onClick={handleSendEmailOtp}
                            disabled={isSendingEmailOtp}
                          >
                            Resend code
                          </button>
                          <button
                            type="button"
                            className="text-muted-foreground hover:underline"
                            onClick={() => {
                              setEmailOtpSent(false);
                              setEmailOtp('');
                              setPendingEmail('');
                            }}
                          >
                            Use a different email
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bio */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Bio
                  {!profile.bio && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                      Optional
                    </Badge>
                  )}
                </Label>
                {isEditing ? (
                  <div>
                    <textarea
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      placeholder="Tell us a bit about yourself..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.bio.length}/500 characters
                    </p>
                  </div>
                ) : (
                  <p className="text-sm">
                    {profile.bio || (
                      <span className="text-muted-foreground italic">
                        No bio added
                      </span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Candidate-specific fields */}
          {profile.role === 'candidate' && profile.candidate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Candidate Profile
                </CardTitle>
                <CardDescription>
                  These fields are required for a complete candidate profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Party / Independent (read-only here, set during application) */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    Party Affiliation
                    {!(profile.candidate.party_id || profile.candidate.is_independent) && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Missing
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm">
                    {profile.candidate.is_independent
                      ? 'Independent candidate'
                      : profile.candidate.party_id
                        ? 'Party affiliated'
                        : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    To change your party affiliation, contact support.
                  </p>
                </div>

                {/* Campaign slogan */}
                <div>
                  <Label htmlFor="campaign_slogan" className="flex items-center gap-2 mb-2">
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                    Campaign Slogan
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      Required
                    </Badge>
                  </Label>
                  {isEditing ? (
                    <Input
                      id="campaign_slogan"
                      value={candidateForm.campaign_slogan}
                      onChange={(e) =>
                        setCandidateForm((prev) => ({
                          ...prev,
                          campaign_slogan: e.target.value,
                        }))
                      }
                      maxLength={500}
                      placeholder="e.g. Building a better tomorrow, together"
                    />
                  ) : (
                    <p className="text-sm">
                      {profile.candidate.campaign_slogan || (
                        <span className="text-muted-foreground italic">No slogan set</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Manifesto text */}
                <div>
                  <Label htmlFor="manifesto_text" className="flex items-center gap-2 mb-2">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                    Manifesto
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      Required
                    </Badge>
                  </Label>
                  {isEditing ? (
                    <textarea
                      id="manifesto_text"
                      value={candidateForm.manifesto_text}
                      onChange={(e) =>
                        setCandidateForm((prev) => ({
                          ...prev,
                          manifesto_text: e.target.value,
                        }))
                      }
                      rows={6}
                      placeholder="Outline your vision, key policies and pledges to voters..."
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {profile.candidate.manifesto_text || (
                        <span className="text-muted-foreground italic">No manifesto added</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Manifesto PDF (optional) */}
                <div>
                  <Label htmlFor="manifesto_pdf_url" className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Manifesto PDF URL
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                      Optional
                    </Badge>
                  </Label>
                  {isEditing ? (
                    <Input
                      id="manifesto_pdf_url"
                      type="url"
                      value={candidateForm.manifesto_pdf_url}
                      onChange={(e) =>
                        setCandidateForm((prev) => ({
                          ...prev,
                          manifesto_pdf_url: e.target.value,
                        }))
                      }
                      placeholder="https://..."
                    />
                  ) : (
                    <p className="text-sm break-all">
                      {profile.candidate.manifesto_pdf_url || (
                        <span className="text-muted-foreground italic">Not provided</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Campaign video (optional) */}
                <div>
                  <Label htmlFor="campaign_video_url" className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Campaign Video URL
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                      Optional
                    </Badge>
                  </Label>
                  {isEditing ? (
                    <Input
                      id="campaign_video_url"
                      type="url"
                      value={candidateForm.campaign_video_url}
                      onChange={(e) =>
                        setCandidateForm((prev) => ({
                          ...prev,
                          campaign_video_url: e.target.value,
                        }))
                      }
                      placeholder="https://youtube.com/..."
                    />
                  ) : (
                    <p className="text-sm break-all">
                      {profile.candidate.campaign_video_url || (
                        <span className="text-muted-foreground italic">Not provided</span>
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="location" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Electoral Location
              </CardTitle>
              <CardDescription>
                Your registered polling station and electoral area
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Location Display */}
              {profile.polling_station_id && !showStationSelector ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        County
                      </p>
                      <p className="font-medium mt-1">
                        {profile.county_name || '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Constituency
                      </p>
                      <p className="font-medium mt-1">
                        {profile.constituency_name || '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Ward
                      </p>
                      <p className="font-medium mt-1">
                        {profile.ward_name || '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Polling Station
                      </p>
                      <p className="font-medium mt-1">
                        {profile.polling_station_name || '—'}
                      </p>
                    </div>
                  </div>
                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={() => setShowStationSelector(true)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Change Polling Station
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {!profile.polling_station_id && !isEditing && (
                    <div className="text-center py-8">
                      <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium">No polling station selected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Set your polling station to see relevant candidates and polls.
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => {
                          setIsEditing(true);
                          setShowStationSelector(true);
                        }}
                      >
                        Select Polling Station
                      </Button>
                    </div>
                  )}
                  {(isEditing || showStationSelector) && (
                    <div>
                      {showStationSelector && profile.polling_station_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mb-3"
                          onClick={() => setShowStationSelector(false)}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Keep current station
                        </Button>
                      )}
                      <PollingStationSelector
                        onSelect={handlePollingStationSelect}
                        selectedId={formData.polling_station_id}
                      />
                      {pollingStationName && formData.polling_station_id !== profile.polling_station_id && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>New station:</strong> {pollingStationName}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            This will update your ward, constituency, and county automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Details
              </CardTitle>
              <CardDescription>
                Account information and verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone Number
                    {!profile.phone && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Missing
                      </Badge>
                    )}
                  </Label>
                  {profile.phone ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{profile.phone}</p>
                        <Badge variant="success" className="text-xs">
                          Verified
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Phone number cannot be changed once verified.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Add and verify a phone number to complete your profile and
                        receive SMS notifications.
                      </p>
                      {!phoneOtpSent ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="tel"
                            inputMode="tel"
                            placeholder="07XX XXX XXX"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            className="sm:flex-1"
                            disabled={isSendingPhoneOtp}
                          />
                          <Button
                            onClick={handleSendPhoneOtp}
                            disabled={isSendingPhoneOtp || !phoneInput.trim()}
                          >
                            {isSendingPhoneOtp ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Send code'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            We sent a 6-digit code to{' '}
                            <span className="font-medium">{pendingPhone}</span>.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="6-digit code"
                              value={phoneOtp}
                              onChange={(e) =>
                                setPhoneOtp(e.target.value.replace(/\D/g, ''))
                              }
                              className="sm:flex-1"
                              disabled={isVerifyingPhoneOtp}
                            />
                            <Button
                              onClick={handleVerifyPhoneOtp}
                              disabled={isVerifyingPhoneOtp || phoneOtp.length < 4}
                            >
                              {isVerifyingPhoneOtp ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify & save'
                              )}
                            </Button>
                          </div>
                          <div className="flex gap-3 text-xs">
                            <button
                              type="button"
                              className="text-primary hover:underline disabled:opacity-50"
                              onClick={handleSendPhoneOtp}
                              disabled={isSendingPhoneOtp}
                            >
                              Resend code
                            </button>
                            <button
                              type="button"
                              className="text-muted-foreground hover:underline"
                              onClick={() => {
                                setPhoneOtpSent(false);
                                setPhoneOtp('');
                                setPendingPhone('');
                              }}
                            >
                              Use a different number
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block">ID Number</Label>
                  <p className="text-sm font-medium">
                    {profile.id_number
                      ? `${profile.id_number.slice(0, 3)}****${profile.id_number.slice(-2)}`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ID number is used for verification
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block">Account Role</Label>
                  <Badge className="capitalize">{profile.role}</Badge>
                </div>

                <div>
                  <Label className="mb-2 block">Verification Status</Label>
                  <Badge variant={profile.is_verified ? 'success' : 'outline'}>
                    {profile.is_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>

                <div>
                  <Label className="mb-2 block">Member Since</Label>
                  <p className="text-sm">
                    {new Date(profile.created_at).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block">Last Updated</Label>
                  <p className="text-sm">
                    {new Date(profile.updated_at).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save / Cancel Actions */}
      {isEditing && (
        <div className="flex items-center gap-3 sticky bottom-6 bg-background/95 backdrop-blur p-4 rounded-lg border shadow-lg">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-none"
          >
            {isSaving ? (
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
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setShowStationSelector(false);
              // Reset form to current profile data
              if (profile) {
                setFormData({
                  full_name: profile.full_name || '',
                  email: profile.email?.endsWith('@myvote.ke')
                    ? ''
                    : profile.email || '',
                  gender: profile.gender || '',
                  age_bracket: profile.age_bracket || '',
                  bio: profile.bio || '',
                  polling_station_id: profile.polling_station_id || '',
                });
                setPollingStationName(profile.polling_station_name || '');
                if (profile.candidate) {
                  setCandidateForm({
                    campaign_slogan: profile.candidate.campaign_slogan || '',
                    manifesto_text: profile.candidate.manifesto_text || '',
                    manifesto_pdf_url: profile.candidate.manifesto_pdf_url || '',
                    campaign_video_url: profile.candidate.campaign_video_url || '',
                  });
                }
              }
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
          {completion && (
            <div className="hidden md:flex items-center gap-2 ml-auto text-sm text-muted-foreground">
              <Progress
                value={completion.percentage}
                className="w-32 h-2"
              />
              <span>{completion.percentage}% complete</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
