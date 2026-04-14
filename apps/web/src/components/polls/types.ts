/**
 * Shared poll types used across all poll components
 */

export interface PollCandidate {
  id: string;
  text: string;
  candidateName: string;
  party: string;
  avatar?: string;
  votes: number;
  percentage: number;
}

export interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollCandidate[];
  totalVotes: number;
  status: 'active' | 'completed' | 'scheduled' | 'draft' | 'cancelled';
  position: string;
  positionLabel: string;
  startsAt?: string;
  endsAt?: string;
  hasVoted: boolean;
  userVote?: string;
  createdAt: string;
  isPartyNomination?: boolean;
  party?: { id: string; name: string; abbreviation: string } | null;
}

export interface AdminPoll {
  id: string;
  title: string;
  description: string | null;
  position: string;
  positionLabel: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  start_time: string;
  end_time: string;
  total_votes: number;
  county?: { id: string; name: string } | null;
  constituency?: { id: string; name: string } | null;
  ward?: { id: string; name: string } | null;
  party?: { id: string; name: string; abbreviation: string } | null;
  is_party_nomination: boolean;
  created_at: string;
  creator?: { id: string; full_name: string } | null;
}

export interface PollResultsByRegion {
  regionId: string;
  regionName: string;
  totalVotes: number;
  candidates: {
    candidateId: string;
    name: string;
    party: string;
    votes: number;
    percentage: number;
  }[];
}

export interface PollResultsData {
  pollId: string;
  pollTitle: string;
  totalVotes: number;
  byCounty: PollResultsByRegion[];
  byConstituency?: PollResultsByRegion[];
  byWard?: PollResultsByRegion[];
  byGender: { gender: string; votes: number; percentage: number }[];
  byAge: { age: string; votes: number; percentage: number }[];
}

export const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-500', text: 'text-gray-500', label: 'Draft' },
  scheduled: { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Scheduled' },
  active: { bg: 'bg-green-500', text: 'text-green-500', label: 'Active' },
  completed: { bg: 'bg-purple-500', text: 'text-purple-500', label: 'Completed' },
  cancelled: { bg: 'bg-red-500', text: 'text-red-500', label: 'Cancelled' },
};

export const POSITION_FILTERS = [
  { value: 'all', label: 'All Positions' },
  { value: 'president', label: 'Presidential' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'women_rep', label: 'Women Rep' },
  { value: 'mp', label: 'MP' },
  { value: 'mca', label: 'MCA' },
];

export const POSITION_LABELS: Record<string, string> = {
  president: 'Presidential',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Rep',
  mp: 'Member of Parliament',
  mca: 'MCA',
};
