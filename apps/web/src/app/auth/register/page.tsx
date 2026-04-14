'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Vote, Phone, Mail, User, CreditCard, ArrowLeft, Loader2, CheckCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PollingStationSelector } from '@/components/auth/polling-station-selector';

type Step = 'identifier' | 'otp' | 'details' | 'polling_station';
type AuthMethod = 'phone' | 'email';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('identifier');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [phone, setPhone] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [formData, setFormData] = useState({
    idNumber: '',
    firstName: '',
    lastName: '',
  });
  const [pollingStationId, setPollingStationId] = useState('');
  const [pollingStationName, setPollingStationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [normalizedEmail, setNormalizedEmail] = useState('');
  const [isIdentifierVerified, setIsIdentifierVerified] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

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

  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^(\+254|0)[17]\d{8}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMethod === 'phone' && !validatePhone(phone)) {
      toast({
        variant: 'destructive',
        title: 'Invalid phone number',
        description: 'Please enter a valid Kenyan phone number.',
      });
      return;
    }

    setIsLoading(true);

    try {
      let requestBody: Record<string, string>;

      if (authMethod === 'email') {
        const trimmedEmail = emailInput.trim().toLowerCase();
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

      // DEV MODE: Show OTP in toast if returned
      if (data.devOtp) {
        toast({
          title: 'DEV MODE - OTP sent!',
          description: `Your OTP is: ${data.devOtp}`,
          duration: 30000, // Show for 30 seconds
        });
      } else {
        const destination = authMethod === 'email' ? emailInput : normalizePhone(phone);
        toast({
          title: 'OTP sent!',
          description: `Enter the 6-digit code sent to ${destination}`,
        });
      }

      setStep('otp');
      setCountdown(60);
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
      const verifyBody: Record<string, string> = {
        otp: otpCode,
        action: 'register',
      };
      if (authMethod === 'email') {
        verifyBody.email = normalizedEmail;
      } else {
        verifyBody.phone = normalizedPhone;
      }

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      setIsIdentifierVerified(true);
      toast({
        title: authMethod === 'email' ? 'Email verified!' : 'Phone verified!',
        description: 'Now complete your profile to create your account.',
      });
      setStep('details');
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

      // DEV MODE: Show OTP in toast if returned
      if (data.devOtp) {
        toast({
          title: 'DEV MODE - OTP resent!',
          description: `Your OTP is: ${data.devOtp}`,
          duration: 30000,
        });
      } else {
        toast({
          title: 'OTP resent!',
          description: authMethod === 'email'
            ? 'Check your email for the new code.'
            : 'Check your phone for the new code.',
        });
      }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (formData.idNumber.length < 7 || formData.idNumber.length > 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid ID number',
        description: 'ID number must be between 7 and 10 digits.',
      });
      return;
    }

    if (formData.firstName.length < 2 || formData.lastName.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Invalid name',
        description: 'Names must be at least 2 characters.',
      });
      return;
    }

    // Move to polling station selection step
    setStep('polling_station');
  };

  const handleFinalRegister = async (skipPollingStation = false) => {
    if (!skipPollingStation && !pollingStationId) {
      toast({
        variant: 'destructive',
        title: 'Select a polling station',
        description: 'Please select your polling station to complete registration.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, string> = {
        idNumber: formData.idNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
      };

      if (authMethod === 'email') {
        payload.email = normalizedEmail;
      } else {
        payload.phone = normalizedPhone;
      }

      if (pollingStationId) {
        payload.pollingStationId = pollingStationId;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      toast({
        title: 'Account created!',
        description: 'Welcome to myVote Kenya. Please log in.',
      });

      router.push(data.redirectTo || '/auth/login?registered=true');
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case 'identifier': return 1;
      case 'otp': return 2;
      case 'details': return 3;
      case 'polling_station': return 4;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-lg text-primary-foreground">
          <h2 className="text-4xl font-bold mb-6">
            Join Kenya&apos;s Electoral Community
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Create your free account and start following candidates, 
            participating in polls, and staying informed about elections.
          </p>
          <div className="space-y-4">
            <div className={`flex items-center space-x-3 ${step === 'identifier' ? 'opacity-100' : 'opacity-60'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getStepNumber() > 1 ? 'bg-white/40' : 'bg-white/20'
              }`}>
                {getStepNumber() > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
              </div>
              <span>Enter your email or phone number</span>
            </div>
            <div className={`flex items-center space-x-3 ${step === 'otp' ? 'opacity-100' : 'opacity-60'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getStepNumber() > 2 ? 'bg-white/40' : 'bg-white/20'
              }`}>
                {getStepNumber() > 2 ? <CheckCircle className="h-5 w-5" /> : '2'}
              </div>
              <span>Verify with OTP</span>
            </div>
            <div className={`flex items-center space-x-3 ${step === 'details' ? 'opacity-100' : 'opacity-60'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getStepNumber() > 3 ? 'bg-white/40' : 'bg-white/20'
              }`}>
                {getStepNumber() > 3 ? <CheckCircle className="h-5 w-5" /> : '3'}
              </div>
              <span>Complete your profile</span>
            </div>
            <div className={`flex items-center space-x-3 ${step === 'polling_station' ? 'opacity-100' : 'opacity-60'}`}>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                4
              </div>
              <span>Select your polling station</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2">
              <Vote className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold">myVote Kenya</span>
            </Link>
            <h1 className="mt-6 text-2xl font-bold">Create your account</h1>
            <p className="mt-2 text-muted-foreground">
              {step === 'identifier' && 'Enter your email or phone number to get started'}
              {step === 'otp' && `Enter the code sent to ${authMethod === 'email' ? normalizedEmail : normalizedPhone}`}
              {step === 'details' && 'Complete your profile information'}
              {step === 'polling_station' && 'Select your polling station'}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex mb-8 gap-1">
            <div className={`flex-1 h-2 rounded-full ${getStepNumber() >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ${getStepNumber() >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ${getStepNumber() >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ${getStepNumber() >= 4 ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          {/* Step 1: Email or Phone */}
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
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We&apos;ll send you a verification code via email
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
                    We&apos;ll send you a verification code via SMS
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

          {/* Step 2: OTP Verification */}
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
                  'Verify'
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

          {/* Step 3: Profile Details */}
          {step === 'details' && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  {authMethod === 'email' ? `Email verified: ${normalizedEmail}` : `Phone verified: ${normalizedPhone}`}
                </div>
              </div>

              {/* ID Number */}
              <div>
                <label htmlFor="idNumber" className="block text-sm font-medium mb-2">
                  National ID Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    id="idNumber"
                    name="idNumber"
                    type="text"
                    placeholder="12345678"
                    value={formData.idNumber}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used for identity verification (kept private)
                </p>
              </div>

              {/* Name Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-6" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Continue to Polling Station'
                )}
              </Button>
            </form>
          )}

          {/* Step 4: Polling Station Selection */}
          {step === 'polling_station' && (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to profile
              </button>

              <div className="flex items-center justify-center mb-2">
                <div className="flex items-center text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  {formData.firstName} {formData.lastName}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Select your registered polling station. This determines which candidates and polls 
                  you see. Drill down from county to your exact station.
                </p>
                <PollingStationSelector
                  onSelect={(id, name) => {
                    setPollingStationId(id);
                    setPollingStationName(name);
                  }}
                  selectedId={pollingStationId}
                />
              </div>

              <Button
                onClick={() => handleFinalRegister(false)}
                className="w-full py-6"
                disabled={isLoading || !pollingStationId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => handleFinalRegister(true)}
                disabled={isLoading}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              >
                Skip for now — I&apos;ll set this later
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-8 border-t">
            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
