export const APP_NAME = 'myVote Kenya';

export const ELECTORAL_POSITIONS = [
  'president',
  'governor',
  'senator',
  'women_rep',
  'mp',
  'mca',
] as const;

export type ElectoralPosition = (typeof ELECTORAL_POSITIONS)[number];

export const POSITION_LABELS: Record<ElectoralPosition, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Rep",
  mp: 'Member of Parliament',
  mca: 'MCA',
};

export const POSITION_ICONS: Record<ElectoralPosition, string> = {
  president: 'flag',
  governor: 'building',
  senator: 'briefcase',
  women_rep: 'users',
  mp: 'user-check',
  mca: 'map-pin',
};

export const USER_ROLES = ['voter', 'candidate', 'agent', 'admin', 'super_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AGE_BRACKETS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;

export const GENDERS = ['male', 'female', 'prefer_not_to_say'] as const;

export const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Prefer not to say',
};

// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
