'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, MapPin, Users, CheckCircle, Building2, Calendar,
  Facebook, Twitter, Instagram, FileText, PlayCircle, Share2, Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from '@/components/candidates';
import { useToast } from '@/components/ui/use-toast';
import { SiteHeader, SiteFooter } from '@/components/layout';

interface CandidateDetail {
  id: string;
  name: string;
  position: string;
  positionLabel: string;
  photoUrl?: string;
  bio?: string;
  gender?: string;
  ageBracket?: string;
  party?: {
    id: string;
    name: string;
    abbreviation: string;
    primaryColor: string;
    secondaryColor: string;
    symbolUrl?: string;
    leaderName?: string;
  };
  isIndependent: boolean;
  isVerified: boolean;
  followerCount: number;
  isFollowing: boolean;
  location: string;
  slogan?: string;
  manifesto?: string;
  manifestoPdfUrl?: string;
  videoUrl?: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };
  demographics: {
    total: number;
    byGender: Record<string, number>;
    byAge: Record<string, number>;
  };
  joinedAt: string;
}

const positionColors: Record<string, string> = {
  president: 'bg-purple-500',
  governor: 'bg-blue-500',
  senator: 'bg-green-500',
  women_rep: 'bg-pink-500',
  mp: 'bg-orange-500',
  mca: 'bg-teal-500',
};

export default function CandidateProfilePage() {
  const params = useParams();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'manifesto' | 'analytics'>('about');

  useEffect(() => {
    fetchCandidate();
  }, [params?.id]);

  const fetchCandidate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/candidates/${params?.id}`);
      const data = await response.json();

      if (response.ok) {
        setCandidate(data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to load candidate',
        });
      }
    } catch (error) {
      console.error('Failed to fetch candidate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load candidate profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && candidate) {
      try {
        await navigator.share({
          title: `${candidate.name} - ${candidate.positionLabel} Candidate`,
          text: candidate.slogan || `Check out ${candidate.name}'s profile on myVote Kenya`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied!',
        description: 'Profile link copied to clipboard',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Candidate not found</h1>
        <Link href="/candidates">
          <Button>Back to Candidates</Button>
        </Link>
      </div>
    );
  }

  const initials = candidate.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Back button */}
        <div className="container py-4">
          <Link 
            href="/candidates" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Candidates
          </Link>
        </div>

        {/* Hero Section */}
        <section className="border-b">
          <div 
            className="h-48 md:h-64"
            style={{ 
              background: candidate.party?.primaryColor 
                ? `linear-gradient(135deg, ${candidate.party.primaryColor}40 0%, ${candidate.party.secondaryColor || candidate.party.primaryColor}20 100%)`
                : 'linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.05) 100%)'
            }}
          />
          
          <div className="container relative pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6 md:left-8">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={candidate.photoUrl} alt={candidate.name} />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="pt-20 md:ml-44 md:pt-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    className={`text-white ${positionColors[candidate.position] || 'bg-gray-500'}`}
                  >
                    {candidate.positionLabel}
                  </Badge>
                  {candidate.isVerified && (
                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                      <CheckCircle className="h-3 w-3 mr-1 fill-current" />
                      Verified
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  {candidate.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
                  {candidate.party ? (
                    <span className="flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      {candidate.party.name} ({candidate.party.abbreviation})
                    </span>
                  ) : candidate.isIndependent ? (
                    <Badge variant="outline">Independent</Badge>
                  ) : null}
                  
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {candidate.location}
                  </span>
                  
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {candidate.followerCount.toLocaleString()} followers
                  </span>
                </div>

                {candidate.slogan && (
                  <p className="mt-3 text-lg italic text-muted-foreground">
                    &ldquo;{candidate.slogan}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <FollowButton
                  candidateId={candidate.id}
                  initialIsFollowing={candidate.isFollowing}
                  followerCount={candidate.followerCount}
                  size="lg"
                />
                <Button variant="outline" size="lg" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="border-b">
          <div className="container">
            <nav className="flex gap-6 -mb-px">
              {[
                { id: 'about', label: 'About' },
                { id: 'manifesto', label: 'Manifesto' },
                { id: 'analytics', label: 'Analytics' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </section>

        {/* Tab Content */}
        <section className="py-8">
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {activeTab === 'about' && (
                  <>
                    {/* Bio */}
                    <Card>
                      <CardHeader>
                        <CardTitle>About</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {candidate.bio ? (
                          <p className="whitespace-pre-wrap">{candidate.bio}</p>
                        ) : (
                          <p className="text-muted-foreground">
                            No biography available yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Campaign Video */}
                    {candidate.videoUrl && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PlayCircle className="h-5 w-5" />
                            Campaign Video
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                            <iframe
                              src={candidate.videoUrl}
                              className="w-full h-full"
                              allowFullScreen
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {activeTab === 'manifesto' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Manifesto
                        </span>
                        {candidate.manifestoPdfUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={candidate.manifestoPdfUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 mr-2" />
                              Download PDF
                            </a>
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {candidate.manifesto ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <p className="whitespace-pre-wrap">{candidate.manifesto}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          No manifesto available yet.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'analytics' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Follower Demographics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Gender Distribution */}
                        <div>
                          <h4 className="font-medium mb-3">By Gender</h4>
                          <div className="space-y-2">
                            {Object.entries(candidate.demographics.byGender).map(([gender, count]) => (
                              <div key={gender} className="flex items-center justify-between">
                                <span className="capitalize">{gender.replace('_', ' ')}</span>
                                <span className="text-muted-foreground">
                                  {count} ({Math.round((count / candidate.demographics.total) * 100)}%)
                                </span>
                              </div>
                            ))}
                            {Object.keys(candidate.demographics.byGender).length === 0 && (
                              <p className="text-muted-foreground text-sm">No data available</p>
                            )}
                          </div>
                        </div>

                        {/* Age Distribution */}
                        <div>
                          <h4 className="font-medium mb-3">By Age Group</h4>
                          <div className="space-y-2">
                            {Object.entries(candidate.demographics.byAge).map(([age, count]) => (
                              <div key={age} className="flex items-center justify-between">
                                <span>{age}</span>
                                <span className="text-muted-foreground">
                                  {count} ({Math.round((count / candidate.demographics.total) * 100)}%)
                                </span>
                              </div>
                            ))}
                            {Object.keys(candidate.demographics.byAge).length === 0 && (
                              <p className="text-muted-foreground text-sm">No data available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Party Info */}
                {candidate.party && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Political Party
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: `${candidate.party.primaryColor}15` }}
                      >
                        {candidate.party.symbolUrl && (
                          <img 
                            src={candidate.party.symbolUrl} 
                            alt={candidate.party.name}
                            className="h-16 w-16 object-contain mb-3"
                          />
                        )}
                        <h4 className="font-semibold">{candidate.party.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {candidate.party.abbreviation}
                        </p>
                        {candidate.party.leaderName && (
                          <p className="text-sm mt-2">
                            Party Leader: {candidate.party.leaderName}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Social Links */}
                <Card>
                  <CardHeader>
                    <CardTitle>Connect</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {candidate.socialLinks.facebook && (
                      <a 
                        href={candidate.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Facebook className="h-5 w-5 text-blue-600" />
                        Facebook
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {candidate.socialLinks.twitter && (
                      <a 
                        href={candidate.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Twitter className="h-5 w-5 text-sky-500" />
                        Twitter / X
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {candidate.socialLinks.instagram && (
                      <a 
                        href={candidate.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Instagram className="h-5 w-5 text-pink-600" />
                        Instagram
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {!candidate.socialLinks.facebook && 
                     !candidate.socialLinks.twitter && 
                     !candidate.socialLinks.instagram && (
                      <p className="text-sm text-muted-foreground">
                        No social links available
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Followers</span>
                      <span className="font-semibold">{candidate.followerCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Joined</span>
                      <span className="font-semibold">
                        {new Date(candidate.joinedAt).toLocaleDateString('en-KE', {
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={candidate.isVerified ? 'success' : 'outline'}>
                        {candidate.isVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}