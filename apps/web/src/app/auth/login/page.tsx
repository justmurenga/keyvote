'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Vote, Phone, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

type Step = 'identifier' | 'otp';
type AuthMethod = 'phone' | 'email';

function LoginPageContent() {
  const [step, setStep] = useState<Step>('identifier');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [normalizedEmail, setNormalizedEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Show success message if just registered
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      toast({
        title: 'Account created!',
        description: 'Please log in with your phone number.',
      });
    }
  }, [searchParams, toast]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const normalizePhone = (phoneNumber: string): string => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('254')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+254${cleaned.slice(1)}`;
    if (cleaned.length === 9) return `+254${cleaned}`;
    return phoneNumber;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let requestBody: Record<string, string>;

      if (authMethod === 'email') {
        const trimmedEmail = email.trim().toLowerCase();
        setNormalizedEmail(trimmedEmail);
        requestBody = { email: trimmedEmail };
      } else {
        const normalized = normalizePhone(phone);
        setNormalizedPhone(normalized);
        requestBody = { phone: normalized };
      }

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      const destination = authMethod === 'email' ? email : normalizePhone(phone);
      toast({
        title: 'OTP sent!',
        description: `Enter the 6-digit code sent to ${destination}`,
      });

      setStep('otp');
      setCountdown(60);
      // Focus first OTP input
      setTimeout(() => otpInputs.current[0]?.focus(), 100);
    } catch (error) {
      console.error('Send OTP error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to send OTP',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      digits.split('').forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        otpInputs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit code.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP and login in one call
      const verifyBody: Record<string, string> = {
        otp: otpCode,
        action: 'login',
      };
      if (authMethod === 'email') {
        verifyBody.email = normalizedEmail;
      } else {
        verifyBody.phone = normalizedPhone;
      }

      const verifyResponse = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyBody),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        if (verifyData.needsRegistration) {
          toast({
            variant: 'destructive',
            title: 'Account not found',
            description: 'Please create an account first.',
          });
          router.push('/auth/register');
          return;
        }
        throw new Error(verifyData.error || 'Failed to verify OTP');
      }

      // Login successful - verify-otp handles everything when action='login'
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${verifyData.user?.full_name || 'User'}`,
      });

      // Determine redirect destination: use searchParams redirect or API response or default
      const redirectTo = searchParams.get('redirect') || verifyData.redirectTo || '/dashboard';

      // Use window.location for hard redirect to ensure cookies are sent on new request
      window.location.href = redirectTo;
      return; // Prevent any further execution after redirect
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    try {
      const resendBody: Record<string, string> = authMethod === 'email'
        ? { email: normalizedEmail }
        : { phone: normalizedPhone };

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resendBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      toast({
        title: 'OTP resent!',
        description: authMethod === 'email'
          ? 'Check your email for the new code.'
          : 'Check your phone for the new code.',
      });
      setOtp(['', '', '', '', '', '']);
      setCountdown(60);
      otpInputs.current[0]?.focus();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to resend OTP',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2">
              <Vote className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold">myVote Kenya</span>
            </Link>
            <h1 className="mt-6 text-2xl font-bold">Welcome back</h1>
            <p className="mt-2 text-muted-foreground">
              {step === 'identifier' 
                ? 'Sign in to your account'
                : `Enter the code sent to ${authMethod === 'email' ? normalizedEmail : normalizedPhone}`
              }
            </p>
          </div>

          {step === 'identifier' && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              {/* Auth method toggle */}
              <div className="flex rounded-lg border p-1 bg-muted/50">
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    authMethod === 'email'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    authMethod === 'phone'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  Phone
                </button>
              </div>

              {authMethod === 'email' ? (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We&apos;ll send you a one-time verification code via email
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="phone"
                      type="tel"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We&apos;ll send you a one-time verification code via SMS
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full py-6" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <button
                type="button"
                onClick={() => {
                  setStep('identifier');
                  setOtp(['', '', '', '', '', '']);
                }}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Change {authMethod === 'email' ? 'email' : 'number'}
              </button>

              <div>
                <label className="block text-sm font-medium mb-4 text-center">
                  Verification Code
                </label>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpInputs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full py-6" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={countdown > 0 || isLoading}
                  className={`text-sm ${
                    countdown > 0 
                      ? 'text-muted-foreground cursor-not-allowed' 
                      : 'text-primary hover:underline'
                  }`}
                >
                  {countdown > 0 
                    ? `Resend code in ${countdown}s` 
                    : "Didn't receive the code? Resend"
                  }
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Access via USSD: <span className="font-mono">*384*VOTE#</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-lg text-primary-foreground">
          <h2 className="text-4xl font-bold mb-6">
            Your Voice Matters in Kenya&apos;s Democracy
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Follow candidates, participate in polls, and track election results 
            from your polling station to the national level.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                ✓
              </div>
              <span>Passwordless login with OTP</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                ✓
              </div>
              <span>Real-time election results tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                ✓
              </div>
              <span>SMS & WhatsApp notifications</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
