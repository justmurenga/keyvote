import { redirect } from 'next/navigation';

/**
 * The standalone "Edit Campaign" page has been merged into the unified
 * candidate dashboard. Preserve any existing links / bookmarks by redirecting
 * to the dashboard with the edit tab pre-selected.
 */
export default function CandidateProfileRedirectPage() {
  redirect('/dashboard/candidate?tab=edit');
}
