import React from 'react';
import { Redirect } from 'expo-router';

/** Reuse the shared profile-edit screen for candidate "Public Profile" tab. */
export default function CandidateProfileRedirect() {
  return <Redirect href={'/profile-edit' as any} />;
}
