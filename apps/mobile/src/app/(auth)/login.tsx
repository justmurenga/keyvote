import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { signInWithOTP, verifyOTP } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputs = useRef<(TextInput | null)[]>([]);

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
    return `+${cleaned}`;
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);
    const normalized = normalizePhone(phone);

    const { error } = await signInWithOTP(normalized);
    setIsLoading(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setStep('otp');
    setCountdown(60);
    setTimeout(() => otpInputs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    const normalized = normalizePhone(phone);
    const { error } = await verifyOTP(normalized, otpCode);
    setIsLoading(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    router.replace('/(tabs)/home');
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    const normalized = normalizePhone(phone);
    await signInWithOTP(normalized);
    setIsLoading(false);
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity
            onPress={() => step === 'otp' ? setStep('phone') : router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <View style={[styles.iconBg, { backgroundColor: colors.primaryFaded }]}>
              <Ionicons name="log-in-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {step === 'phone' ? 'Welcome Back' : 'Verify Your Number'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {step === 'phone'
                ? 'Enter your phone number to sign in'
                : `We sent a 6-digit code to ${normalizePhone(phone)}`}
            </Text>
          </View>

          {/* Phone Step */}
          {step === 'phone' && (
            <View style={styles.form}>
              <Input
                label="Phone Number"
                placeholder="0712 345 678"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
                leftIcon={
                  <Text style={[styles.prefix, { color: colors.textSecondary }]}>🇰🇪 +254</Text>
                }
              />
              <Button
                title="Send OTP Code"
                onPress={handleSendOTP}
                loading={isLoading}
                fullWidth
                size="lg"
              />
            </View>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <View style={styles.form}>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(r) => { otpInputs.current[index] = r; }}
                    style={[
                      styles.otpInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: digit ? colors.primary : colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(index, v)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyDown(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <Button
                title="Verify & Sign In"
                onPress={handleVerifyOTP}
                loading={isLoading}
                fullWidth
                size="lg"
              />

              <TouchableOpacity
                onPress={handleResend}
                disabled={countdown > 0}
                style={styles.resendButton}
              >
                <Text
                  style={[
                    styles.resendText,
                    { color: countdown > 0 ? colors.textTertiary : colors.primary },
                  ]}
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    marginBottom: Spacing['3xl'],
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  prefix: {
    fontSize: FontSize.base,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing['2xl'],
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    textAlign: 'center',
    fontSize: FontSize['2xl'],
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  resendText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: Spacing['3xl'],
  },
  footerText: {
    fontSize: FontSize.base,
  },
  footerLink: {
    fontSize: FontSize.base,
    fontWeight: '700',
  },
});
