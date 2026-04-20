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
import { fetchCounties, fetchConstituencies, fetchWards, fetchPollingStations } from '@/services/api';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { GENDER_LABELS, AGE_BRACKETS } from '@/constants';

type Step = 'phone' | 'otp' | 'details' | 'polling_station';

interface Region {
  id: string;
  code: string;
  name: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { sendOTP, verifyOTP, register, updateProfile } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputs = useRef<(TextInput | null)[]>([]);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [gender, setGender] = useState('');
  const [ageBracket, setAgeBracket] = useState('');

  // Location fields
  const [counties, setCounties] = useState<Region[]>([]);
  const [constituencies, setConstituencies] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedStation, setSelectedStation] = useState('');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Load counties on polling station step
  useEffect(() => {
    if (step === 'polling_station' && counties.length === 0) {
      fetchCounties().then(setCounties).catch(console.error);
    }
  }, [step]);

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
    const { error, devOtp } = await sendOTP(normalized);
    setIsLoading(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    if (devOtp) {
      // In dev mode, auto-fill OTP
      const digits = devOtp.split('');
      setOtp(digits);
    }
    setStep('otp');
    setCountdown(60);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
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

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    setIsLoading(true);
    const normalized = normalizePhone(phone);
    const { error } = await verifyOTP(normalized, otpCode, 'register');
    setIsLoading(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setStep('details');
  };

  const handleSaveDetails = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter your first and last name');
      return;
    }
    setStep('polling_station');
  };

  const handleSelectCounty = async (countyId: string) => {
    setSelectedCounty(countyId);
    setSelectedConstituency('');
    setSelectedWard('');
    setSelectedStation('');
    setConstituencies([]);
    setWards([]);
    setStations([]);

    try {
      const data = await fetchConstituencies(countyId);
      setConstituencies(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectConstituency = async (constituencyId: string) => {
    setSelectedConstituency(constituencyId);
    setSelectedWard('');
    setSelectedStation('');
    setWards([]);
    setStations([]);

    try {
      const data = await fetchWards(constituencyId);
      setWards(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectWard = async (wardId: string) => {
    setSelectedWard(wardId);
    setSelectedStation('');
    setStations([]);

    try {
      const data = await fetchPollingStations(wardId);
      setStations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    const normalized = normalizePhone(phone);

    // Step 1: Register via web API
    const { error: regError } = await register({
      phone: normalized,
      firstName,
      lastName,
      idNumber: idNumber || '00000000',
      pollingStationId: selectedStation || undefined,
    });

    if (regError) {
      setIsLoading(false);
      Alert.alert('Error', regError);
      return;
    }

    // Step 2: Auto-login via verify-otp with login action
    // Send a new OTP for login
    const { error: otpError, devOtp } = await sendOTP(normalized);
    if (otpError) {
      setIsLoading(false);
      // Registration succeeded but auto-login failed, redirect to login
      Alert.alert('Success', 'Account created! Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
      return;
    }

    // If dev OTP is available, auto-verify login
    if (devOtp) {
      const { error: loginError } = await verifyOTP(normalized, devOtp, 'login');
      if (!loginError) {
        // Update extra profile fields
        const profileData: any = {};
        if (gender) profileData.gender = gender;
        if (ageBracket) profileData.age_bracket = ageBracket;
        if (selectedWard) profileData.ward_id = selectedWard;
        if (selectedConstituency) profileData.constituency_id = selectedConstituency;
        if (selectedCounty) profileData.county_id = selectedCounty;
        if (Object.keys(profileData).length > 0) {
          await updateProfile(profileData);
        }
        setIsLoading(false);
        router.replace('/(tabs)/home');
        return;
      }
    }

    setIsLoading(false);
    // Registration succeeded, redirect to login
    Alert.alert('Success', 'Account created successfully! Please sign in.', [
      { text: 'OK', onPress: () => router.replace('/(auth)/login') },
    ]);
  };

  const stepNumber = step === 'phone' ? 1 : step === 'otp' ? 2 : step === 'details' ? 3 : 4;

  const goBack = () => {
    switch (step) {
      case 'otp': setStep('phone'); break;
      case 'details': setStep('otp'); break;
      case 'polling_station': setStep('details'); break;
      default: router.back();
    }
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
          <View style={styles.topBar}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              Step {stepNumber} of 4
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${(stepNumber / 4) * 100}%`,
                },
              ]}
            />
          </View>

          {/* Step: Phone */}
          {step === 'phone' && (
            <View style={styles.stepContent}>
              <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter your Kenyan phone number to get started
              </Text>
              <Input
                label="Phone Number"
                placeholder="0712 345 678"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
                leftIcon={
                  <Text style={[styles.prefix, { color: colors.textSecondary }]}>🇰🇪</Text>
                }
              />
              <Button
                title="Send Verification Code"
                onPress={handleSendOTP}
                loading={isLoading}
                fullWidth
                size="lg"
              />
            </View>
          )}

          {/* Step: OTP */}
          {step === 'otp' && (
            <View style={styles.stepContent}>
              <Text style={[styles.title, { color: colors.text }]}>Verify Number</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter the 6-digit code sent to {normalizePhone(phone)}
              </Text>
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
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>
              <Button
                title="Verify Code"
                onPress={handleVerifyOTP}
                loading={isLoading}
                fullWidth
                size="lg"
              />
            </View>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <View style={styles.stepContent}>
              <Text style={[styles.title, { color: colors.text }]}>Your Details</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Tell us a bit about yourself
              </Text>
              <Input
                label="First Name"
                placeholder="e.g. James"
                value={firstName}
                onChangeText={setFirstName}
                autoFocus
              />
              <Input
                label="Last Name"
                placeholder="e.g. Otieno"
                value={lastName}
                onChangeText={setLastName}
              />
              <Input
                label="National ID Number (Optional)"
                placeholder="e.g. 12345678"
                value={idNumber}
                onChangeText={setIdNumber}
                keyboardType="number-pad"
              />

              {/* Gender Selection */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Gender</Text>
              <View style={styles.chipRow}>
                {Object.entries(GENDER_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setGender(key)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: gender === key ? colors.primaryFaded : colors.surface,
                        borderColor: gender === key ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: gender === key ? colors.primary : colors.textSecondary,
                        fontWeight: gender === key ? '600' : '400',
                        fontSize: 14,
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Age Bracket */}
              <Text style={[styles.fieldLabel, { color: colors.text, marginTop: Spacing.lg }]}>
                Age Bracket
              </Text>
              <View style={styles.chipRow}>
                {AGE_BRACKETS.map((bracket) => (
                  <TouchableOpacity
                    key={bracket}
                    onPress={() => setAgeBracket(bracket)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: ageBracket === bracket ? colors.primaryFaded : colors.surface,
                        borderColor: ageBracket === bracket ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: ageBracket === bracket ? colors.primary : colors.textSecondary,
                        fontWeight: ageBracket === bracket ? '600' : '400',
                        fontSize: 14,
                      }}
                    >
                      {bracket}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Continue"
                onPress={handleSaveDetails}
                fullWidth
                size="lg"
                style={{ marginTop: Spacing['2xl'] }}
              />
            </View>
          )}

          {/* Step: Polling Station */}
          {step === 'polling_station' && (
            <View style={styles.stepContent}>
              <Text style={[styles.title, { color: colors.text }]}>Polling Station</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select your registered polling station
              </Text>

              {/* County */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>County</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {counties.map((county) => (
                    <TouchableOpacity
                      key={county.id}
                      onPress={() => handleSelectCounty(county.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selectedCounty === county.id ? colors.primaryFaded : colors.surface,
                          borderColor: selectedCounty === county.id ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: selectedCounty === county.id ? colors.primary : colors.textSecondary,
                          fontWeight: selectedCounty === county.id ? '600' : '400',
                          fontSize: 13,
                        }}
                      >
                        {county.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Constituency */}
              {constituencies.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.text, marginTop: Spacing.lg }]}>
                    Constituency
                  </Text>
                  <View style={styles.chipRow}>
                    {constituencies.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => handleSelectConstituency(c.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selectedConstituency === c.id ? colors.primaryFaded : colors.surface,
                            borderColor: selectedConstituency === c.id ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selectedConstituency === c.id ? colors.primary : colors.textSecondary,
                            fontWeight: selectedConstituency === c.id ? '600' : '400',
                            fontSize: 13,
                          }}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Ward */}
              {wards.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.text, marginTop: Spacing.lg }]}>Ward</Text>
                  <View style={styles.chipRow}>
                    {wards.map((w) => (
                      <TouchableOpacity
                        key={w.id}
                        onPress={() => handleSelectWard(w.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selectedWard === w.id ? colors.primaryFaded : colors.surface,
                            borderColor: selectedWard === w.id ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selectedWard === w.id ? colors.primary : colors.textSecondary,
                            fontWeight: selectedWard === w.id ? '600' : '400',
                            fontSize: 13,
                          }}
                        >
                          {w.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Polling Station */}
              {stations.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.text, marginTop: Spacing.lg }]}>
                    Polling Station
                  </Text>
                  <View style={styles.chipRow}>
                    {stations.map((s: any) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedStation(s.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selectedStation === s.id ? colors.primaryFaded : colors.surface,
                            borderColor: selectedStation === s.id ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selectedStation === s.id ? colors.primary : colors.textSecondary,
                            fontWeight: selectedStation === s.id ? '600' : '400',
                            fontSize: 13,
                          }}
                        >
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.buttonRow}>
                <Button
                  title="Skip for now"
                  onPress={() => handleComplete()}
                  variant="ghost"
                  size="lg"
                  style={{ flex: 1 }}
                />
                <Button
                  title="Complete"
                  onPress={handleComplete}
                  loading={isLoading}
                  size="lg"
                  disabled={!selectedStation && !selectedCounty}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {/* Footer */}
          {step === 'phone' && (
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  stepContent: {
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    lineHeight: 22,
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
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipScroll: {
    maxHeight: 120,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing['2xl'],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: Spacing['3xl'],
  },
  footerText: { fontSize: FontSize.base },
  footerLink: { fontSize: FontSize.base, fontWeight: '700' },
});
