/**
 * Voter / candidate profile editor — mobile parity for the web
 * `/dashboard/profile` page. All data comes from the shared `profileApi`
 * (which hits the same `/api/profile` route the web uses).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Avatar, Badge, Button, Card, LoadingScreen } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { GENDER_LABELS } from '@/constants';
import { profileApi, ApiError } from '@/lib/api-client';
import type { ProfileResponse, UpdateProfilePayload } from '@/lib/api-client';

const GENDER_OPTIONS: Array<{ value: 'male' | 'female' | 'prefer_not_to_say'; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const AGE_BRACKET_OPTIONS: Array<{ value: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+'; label: string }> = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55-64', label: '55-64' },
  { value: '65+', label: '65+' },
];

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

export default function ProfileEditScreen() {
  const colors = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<ProfileResponse>({
    queryKey: ['profile', 'me'],
    queryFn: () => profileApi.get(),
  });

  const [form, setForm] = useState<UpdateProfilePayload>({});
  const [bioCount, setBioCount] = useState(0);

  useEffect(() => {
    if (data?.profile) {
      const p = data.profile;
      setForm({
        full_name: p.full_name || '',
        email:
          p.email && (p.email.endsWith('@myvote.ke') || p.email.endsWith('@keyvote.online'))
            ? ''
            : p.email || '',
        gender: p.gender ?? null,
        age_bracket: p.age_bracket ?? null,
        bio: p.bio ?? '',
      });
      setBioCount((p.bio || '').length);
    }
  }, [data?.profile]);

  const update = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      Alert.alert('Saved', 'Profile updated successfully');
    },
    onError: (err: any) => {
      const message =
        err instanceof ApiError ? err.message : err?.message || 'Failed to update profile';
      Alert.alert('Error', message);
    },
  });

  const removePhoto = useMutation({
    mutationFn: () => profileApi.removePhoto(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to remove photo'),
  });

  /**
   * Profile photo upload — mirrors the web `/dashboard/profile` flow by
   * POSTing a multipart FormData to the same `/api/profile/photo` route via
   * the shared `profileApi.uploadPhoto`. No extra endpoint duplication.
   */
  const uploadPhoto = useMutation({
    mutationFn: async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Photo library permission denied');

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (picked.canceled || !picked.assets?.length) {
        throw new Error('cancelled');
      }
      const asset = picked.assets[0];
      const form = new FormData();
      // RN multipart file shape understood by react-native fetch.
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      } as any);
      return profileApi.uploadPhoto(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      Alert.alert('Photo updated', 'Your profile photo has been saved.');
    },
    onError: (err: any) => {
      if (err?.message === 'cancelled') return;
      Alert.alert('Upload failed', err?.message || 'Could not upload photo');
    },
  });

  if (isLoading) return <LoadingScreen message="Loading profile..." />;
  if (error || !data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error, marginBottom: 12 }}>
          {(error as Error)?.message || 'Failed to load profile'}
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </SafeAreaView>
    );
  }

  const { profile, completion } = data;

  const onSave = () => {
    const payload: UpdateProfilePayload = {};
    if (form.full_name !== undefined) payload.full_name = form.full_name;
    if (form.email !== undefined) payload.email = form.email || null;
    if (form.gender !== undefined) payload.gender = form.gender;
    if (form.age_bracket !== undefined) payload.age_bracket = form.age_bracket;
    if (form.bio !== undefined) payload.bio = form.bio;
    update.mutate(payload);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Edit Profile', headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>
        {/* Photo */}
        <Card style={{ alignItems: 'center', padding: Spacing.lg }}>
          <Avatar uri={profile.profile_photo_url} name={profile.full_name || 'User'} size={88} />
          <Text style={[styles.name, { color: colors.text }]}>
            {profile.full_name || 'User'}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{profile.phone}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.sm }}>
            <Badge label={profile.role} variant="default" />
            {profile.is_verified && <Badge label="Verified" variant="success" />}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.md }}>
            <Button
              title={uploadPhoto.isPending ? 'Uploading…' : profile.profile_photo_url ? 'Change Photo' : 'Add Photo'}
              variant="outline"
              size="sm"
              disabled={uploadPhoto.isPending}
              onPress={() => uploadPhoto.mutate()}
            />
            <Button
              title="Remove Photo"
              variant="outline"
              size="sm"
              disabled={!profile.profile_photo_url || removePhoto.isPending}
              onPress={() =>
                Alert.alert('Remove photo?', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => removePhoto.mutate() },
                ])
              }
            />
          </View>
        </Card>

        {/* Completion */}
        <Card style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Completion</Text>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{completion.percentage}%</Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: colors.borderLight,
              borderRadius: 4,
              marginTop: 8,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${completion.percentage}%`,
                height: '100%',
                backgroundColor: completion.percentage === 100 ? colors.success : colors.primary,
              }}
            />
          </View>
          {completion.missingFields.length > 0 && (
            <View style={{ marginTop: Spacing.sm }}>
              <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginBottom: 4 }}>
                Still missing:
              </Text>
              {completion.missingFields.slice(0, 5).map((f) => (
                <Text key={f} style={{ color: colors.textSecondary, fontSize: FontSize.xs }}>
                  • {FIELD_LABELS[f] || f}
                </Text>
              ))}
            </View>
          )}
        </Card>

        {/* Basic info */}
        <Card style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>
            Basic Information
          </Text>

          <Field
            label="Full name"
            value={form.full_name || ''}
            onChange={(v) => setForm((s) => ({ ...s, full_name: v }))}
            placeholder="Enter your full name"
            colors={colors}
          />

          <Field
            label="Email"
            value={form.email || ''}
            onChange={(v) => setForm((s) => ({ ...s, email: v }))}
            placeholder="you@example.com"
            keyboardType="email-address"
            colors={colors}
          />

          <ChoiceRow
            label="Gender"
            value={form.gender || ''}
            options={GENDER_OPTIONS}
            onSelect={(v) => setForm((s) => ({ ...s, gender: v as any }))}
            colors={colors}
          />

          <ChoiceRow
            label="Age bracket"
            value={form.age_bracket || ''}
            options={AGE_BRACKET_OPTIONS}
            onSelect={(v) => setForm((s) => ({ ...s, age_bracket: v as any }))}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bio</Text>
          <TextInput
            value={form.bio || ''}
            onChangeText={(v) => {
              if (v.length <= 500) {
                setForm((s) => ({ ...s, bio: v }));
                setBioCount(v.length);
              }
            }}
            placeholder="Tell others a bit about yourself..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
                height: 100,
                textAlignVertical: 'top',
              },
            ]}
          />
          <Text style={{ color: colors.textTertiary, fontSize: FontSize.xs, alignSelf: 'flex-end', marginTop: 4 }}>
            {bioCount}/500
          </Text>
        </Card>

        {/* Location */}
        <Card style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>
            Location
          </Text>
          <Row label="Polling Station" value={profile.polling_station_name || 'Not set'} colors={colors} />
          <Row label="Ward" value={profile.ward_name || '—'} colors={colors} />
          <Row label="Constituency" value={profile.constituency_name || '—'} colors={colors} />
          <Row label="County" value={profile.county_name || '—'} colors={colors} />
          <Text style={{ color: colors.textTertiary, fontSize: FontSize.xs, marginTop: 6 }}>
            To change your polling station, contact support or use the web app.
          </Text>
        </Card>

        {/* Candidate fields */}
        {profile.candidate && (
          <Card style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Candidate Profile</Text>
              <Pressable onPress={() => router.push('/candidate-dashboard' as any)}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Open dashboard</Text>
              </Pressable>
            </View>
            <Row
              label="Position"
              value={String(profile.candidate.position).replace('_', ' ')}
              colors={colors}
            />
            <Row label="Slogan" value={profile.candidate.campaign_slogan || '—'} colors={colors} />
            <Row
              label="Manifesto"
              value={profile.candidate.manifesto_text ? '✓ provided' : 'Missing'}
              colors={colors}
            />
            <Row
              label="Verification"
              value={profile.candidate.verification_status || 'pending'}
              colors={colors}
            />
          </Card>
        )}

        <Button
          title={update.isPending ? 'Saving...' : 'Save Changes'}
          onPress={onSave}
          disabled={update.isPending}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  colors: any;
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[
          styles.input,
          { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
        ]}
      />
    </View>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onSelect,
  colors,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (v: string) => void;
  colors: any;
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: BorderRadius.md,
                borderWidth: 1.5,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primaryFaded : 'transparent',
              }}
            >
              <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: '600' }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  name: { fontSize: FontSize.xl, fontWeight: '700', marginTop: Spacing.md },
  sectionTitle: { fontSize: FontSize.base, fontWeight: '700' },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FontSize.base,
  },
});
