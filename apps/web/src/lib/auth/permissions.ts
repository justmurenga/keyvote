/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and access control for myVote Kenya
 */

// Available roles in the system
export const ROLES = {
  VOTER: 'voter',
  CANDIDATE: 'candidate',
  AGENT: 'agent',
  PARTY_ADMIN: 'party_admin',
  ADMIN: 'admin',
  SYSTEM_ADMIN: 'system_admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// All available permissions in the system
export const PERMISSIONS = {
  // User Management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_CHANGE_ROLE: 'users:change_role',
  USERS_SUSPEND: 'users:suspend',
  
  // Polls Management
  POLLS_VIEW: 'polls:view',
  POLLS_CREATE: 'polls:create',
  POLLS_EDIT: 'polls:edit',
  POLLS_DELETE: 'polls:delete',
  POLLS_PUBLISH: 'polls:publish',
  POLLS_VOTE: 'polls:vote',
  POLLS_VIEW_RESULTS: 'polls:view_results',
  POLLS_VIEW_ANALYTICS: 'polls:view_analytics',
  
  // Candidates Management
  CANDIDATES_VIEW: 'candidates:view',
  CANDIDATES_CREATE: 'candidates:create',
  CANDIDATES_EDIT: 'candidates:edit',
  CANDIDATES_DELETE: 'candidates:delete',
  CANDIDATES_VERIFY: 'candidates:verify',
  CANDIDATES_FOLLOW: 'candidates:follow',
  
  // Election Results
  RESULTS_VIEW: 'results:view',
  RESULTS_SUBMIT: 'results:submit',
  RESULTS_VERIFY: 'results:verify',
  RESULTS_EDIT: 'results:edit',
  
  // Agents Management
  AGENTS_VIEW: 'agents:view',
  AGENTS_CREATE: 'agents:create',
  AGENTS_EDIT: 'agents:edit',
  AGENTS_DELETE: 'agents:delete',
  AGENTS_APPROVE: 'agents:approve',
  AGENTS_PAY: 'agents:pay',
  
  // Messages
  MESSAGES_VIEW: 'messages:view',
  MESSAGES_SEND: 'messages:send',
  MESSAGES_BROADCAST: 'messages:broadcast',
  
  // Wallet
  WALLET_VIEW: 'wallet:view',
  WALLET_TOPUP: 'wallet:topup',
  WALLET_TRANSFER: 'wallet:transfer',
  WALLET_WITHDRAW: 'wallet:withdraw',
  WALLET_VIEW_ALL: 'wallet:view_all',
  
  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_CREATE: 'reports:create',
  REPORTS_REVIEW: 'reports:review',
  REPORTS_EXPORT: 'reports:export',
  
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SETTINGS_SYSTEM: 'settings:system',
  
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_ADMIN: 'dashboard:admin',
  DASHBOARD_ANALYTICS: 'dashboard:analytics',
  
  // Notifications
  NOTIFICATIONS_VIEW: 'notifications:view',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  
  // Political Parties
  PARTIES_VIEW: 'parties:view',
  PARTIES_CREATE: 'parties:create',
  PARTIES_EDIT: 'parties:edit',
  PARTIES_DELETE: 'parties:delete',
  
  // Regions (Counties, Constituencies, Wards)
  REGIONS_VIEW: 'regions:view',
  REGIONS_MANAGE: 'regions:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role to Permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Voter - Basic access
  [ROLES.VOTER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.POLLS_VIEW,
    PERMISSIONS.POLLS_VOTE,
    PERMISSIONS.POLLS_VIEW_RESULTS,
    PERMISSIONS.CANDIDATES_VIEW,
    PERMISSIONS.CANDIDATES_FOLLOW,
    PERMISSIONS.RESULTS_VIEW,
    PERMISSIONS.WALLET_VIEW,
    PERMISSIONS.WALLET_TOPUP,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.PARTIES_VIEW,
    PERMISSIONS.REGIONS_VIEW,
  ],
  
  // Candidate - Voter permissions + candidate-specific
  [ROLES.CANDIDATE]: [
    // All voter permissions
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.POLLS_VIEW,
    PERMISSIONS.POLLS_VOTE,
    PERMISSIONS.POLLS_VIEW_RESULTS,
    PERMISSIONS.CANDIDATES_VIEW,
    PERMISSIONS.CANDIDATES_FOLLOW,
    PERMISSIONS.RESULTS_VIEW,
    PERMISSIONS.WALLET_VIEW,
    PERMISSIONS.WALLET_TOPUP,
    PERMISSIONS.WALLET_TRANSFER,
    PERMISSIONS.WALLET_WITHDRAW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.PARTIES_VIEW,
    PERMISSIONS.REGIONS_VIEW,
    // Candidate-specific
    PERMISSIONS.CANDIDATES_EDIT, // Own profile
    PERMISSIONS.AGENTS_VIEW,
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.AGENTS_EDIT,
    PERMISSIONS.AGENTS_DELETE,
    PERMISSIONS.AGENTS_PAY,
    PERMISSIONS.MESSAGES_VIEW,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.MESSAGES_BROADCAST,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.DASHBOARD_ANALYTICS,
  ],
  
  // Agent - Limited access for field operations
  [ROLES.AGENT]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.POLLS_VIEW,
    PERMISSIONS.POLLS_VOTE,
    PERMISSIONS.POLLS_VIEW_RESULTS,
    PERMISSIONS.CANDIDATES_VIEW,
    PERMISSIONS.RESULTS_VIEW,
    PERMISSIONS.RESULTS_SUBMIT,
    PERMISSIONS.WALLET_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.MESSAGES_VIEW,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.REGIONS_VIEW,
  ],
  
  // Party Admin - Manage party candidates and agents
  [ROLES.PARTY_ADMIN]: [
    // All candidate permissions
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_ANALYTICS,
    PERMISSIONS.POLLS_VIEW,
    PERMISSIONS.POLLS_CREATE,
    PERMISSIONS.POLLS_EDIT,
    PERMISSIONS.POLLS_PUBLISH,
    PERMISSIONS.POLLS_VOTE,
    PERMISSIONS.POLLS_VIEW_RESULTS,
    PERMISSIONS.POLLS_VIEW_ANALYTICS,
    PERMISSIONS.CANDIDATES_VIEW,
    PERMISSIONS.CANDIDATES_CREATE,
    PERMISSIONS.CANDIDATES_EDIT,
    PERMISSIONS.CANDIDATES_FOLLOW,
    PERMISSIONS.RESULTS_VIEW,
    PERMISSIONS.AGENTS_VIEW,
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.AGENTS_EDIT,
    PERMISSIONS.AGENTS_DELETE,
    PERMISSIONS.AGENTS_APPROVE,
    PERMISSIONS.AGENTS_PAY,
    PERMISSIONS.MESSAGES_VIEW,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.MESSAGES_BROADCAST,
    PERMISSIONS.WALLET_VIEW,
    PERMISSIONS.WALLET_TOPUP,
    PERMISSIONS.WALLET_TRANSFER,
    PERMISSIONS.WALLET_WITHDRAW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.PARTIES_VIEW,
    PERMISSIONS.PARTIES_EDIT,
    PERMISSIONS.REGIONS_VIEW,
  ],
  
  // Admin - Most permissions except system-level
  [ROLES.ADMIN]: [
    // User Management
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_SUSPEND,
    // All other permissions
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_ADMIN,
    PERMISSIONS.DASHBOARD_ANALYTICS,
    PERMISSIONS.POLLS_VIEW,
    PERMISSIONS.POLLS_CREATE,
    PERMISSIONS.POLLS_EDIT,
    PERMISSIONS.POLLS_DELETE,
    PERMISSIONS.POLLS_PUBLISH,
    PERMISSIONS.POLLS_VOTE,
    PERMISSIONS.POLLS_VIEW_RESULTS,
    PERMISSIONS.POLLS_VIEW_ANALYTICS,
    PERMISSIONS.CANDIDATES_VIEW,
    PERMISSIONS.CANDIDATES_CREATE,
    PERMISSIONS.CANDIDATES_EDIT,
    PERMISSIONS.CANDIDATES_DELETE,
    PERMISSIONS.CANDIDATES_VERIFY,
    PERMISSIONS.CANDIDATES_FOLLOW,
    PERMISSIONS.RESULTS_VIEW,
    PERMISSIONS.RESULTS_SUBMIT,
    PERMISSIONS.RESULTS_VERIFY,
    PERMISSIONS.AGENTS_VIEW,
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.AGENTS_EDIT,
    PERMISSIONS.AGENTS_DELETE,
    PERMISSIONS.AGENTS_APPROVE,
    PERMISSIONS.AGENTS_PAY,
    PERMISSIONS.MESSAGES_VIEW,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.MESSAGES_BROADCAST,
    PERMISSIONS.WALLET_VIEW,
    PERMISSIONS.WALLET_TOPUP,
    PERMISSIONS.WALLET_TRANSFER,
    PERMISSIONS.WALLET_WITHDRAW,
    PERMISSIONS.WALLET_VIEW_ALL,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.REPORTS_REVIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
    PERMISSIONS.PARTIES_VIEW,
    PERMISSIONS.PARTIES_CREATE,
    PERMISSIONS.PARTIES_EDIT,
    PERMISSIONS.REGIONS_VIEW,
    PERMISSIONS.REGIONS_MANAGE,
  ],
  
  // System Admin - Full access to everything
  [ROLES.SYSTEM_ADMIN]: Object.values(PERMISSIONS),
};

// Role hierarchy (higher index = more privileges)
export const ROLE_HIERARCHY: Role[] = [
  ROLES.VOTER,
  ROLES.AGENT,
  ROLES.CANDIDATE,
  ROLES.PARTY_ADMIN,
  ROLES.ADMIN,
  ROLES.SYSTEM_ADMIN,
];

// Role display names and descriptions
export const ROLE_INFO: Record<Role, { label: string; description: string; color: string }> = {
  [ROLES.VOTER]: {
    label: 'Voter',
    description: 'Standard user who can vote in polls and follow candidates',
    color: 'bg-gray-500',
  },
  [ROLES.CANDIDATE]: {
    label: 'Candidate',
    description: 'Electoral candidate who can manage agents and communicate with followers',
    color: 'bg-blue-500',
  },
  [ROLES.AGENT]: {
    label: 'Agent',
    description: 'Field agent who submits election results and reports',
    color: 'bg-green-500',
  },
  [ROLES.PARTY_ADMIN]: {
    label: 'Party Admin',
    description: 'Political party administrator who manages party candidates',
    color: 'bg-purple-500',
  },
  [ROLES.ADMIN]: {
    label: 'Admin',
    description: 'System administrator with broad access to manage the platform',
    color: 'bg-orange-500',
  },
  [ROLES.SYSTEM_ADMIN]: {
    label: 'System Admin',
    description: 'Super administrator with full access to all features',
    color: 'bg-red-500',
  },
};

// Permission groups for UI display
export const PERMISSION_GROUPS = {
  'User Management': [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_CHANGE_ROLE,
    PERMISSIONS.USERS_SUSPEND,
  ],
  'Polls': [
    PERMISSIONS.POLLS_VIEW,
    PERMISSIONS.POLLS_CREATE,
    PERMISSIONS.POLLS_EDIT,
    PERMISSIONS.POLLS_DELETE,
    PERMISSIONS.POLLS_PUBLISH,
    PERMISSIONS.POLLS_VOTE,
    PERMISSIONS.POLLS_VIEW_RESULTS,
    PERMISSIONS.POLLS_VIEW_ANALYTICS,
  ],
  'Candidates': [
    PERMISSIONS.CANDIDATES_VIEW,
    PERMISSIONS.CANDIDATES_CREATE,
    PERMISSIONS.CANDIDATES_EDIT,
    PERMISSIONS.CANDIDATES_DELETE,
    PERMISSIONS.CANDIDATES_VERIFY,
    PERMISSIONS.CANDIDATES_FOLLOW,
  ],
  'Election Results': [
    PERMISSIONS.RESULTS_VIEW,
    PERMISSIONS.RESULTS_SUBMIT,
    PERMISSIONS.RESULTS_VERIFY,
    PERMISSIONS.RESULTS_EDIT,
  ],
  'Agents': [
    PERMISSIONS.AGENTS_VIEW,
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.AGENTS_EDIT,
    PERMISSIONS.AGENTS_DELETE,
    PERMISSIONS.AGENTS_APPROVE,
    PERMISSIONS.AGENTS_PAY,
  ],
  'Messages': [
    PERMISSIONS.MESSAGES_VIEW,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.MESSAGES_BROADCAST,
  ],
  'Wallet': [
    PERMISSIONS.WALLET_VIEW,
    PERMISSIONS.WALLET_TOPUP,
    PERMISSIONS.WALLET_TRANSFER,
    PERMISSIONS.WALLET_WITHDRAW,
    PERMISSIONS.WALLET_VIEW_ALL,
  ],
  'Reports': [
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.REPORTS_REVIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  'Settings': [
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.SETTINGS_SYSTEM,
  ],
  'Dashboard': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_ADMIN,
    PERMISSIONS.DASHBOARD_ANALYTICS,
  ],
};

// Helper functions
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function canChangeRole(currentRole: Role, targetRole: Role): boolean {
  const currentIndex = ROLE_HIERARCHY.indexOf(currentRole);
  const targetIndex = ROLE_HIERARCHY.indexOf(targetRole);
  // Can only change to roles lower than or equal to own level (except system_admin can change any)
  return currentRole === ROLES.SYSTEM_ADMIN || currentIndex >= targetIndex;
}

export function isRoleHigherOrEqual(role1: Role, role2: Role): boolean {
  return ROLE_HIERARCHY.indexOf(role1) >= ROLE_HIERARCHY.indexOf(role2);
}

export function getAvailableRolesForAssignment(currentRole: Role): Role[] {
  if (currentRole === ROLES.SYSTEM_ADMIN) {
    return [...ROLE_HIERARCHY];
  }
  const currentIndex = ROLE_HIERARCHY.indexOf(currentRole);
  return ROLE_HIERARCHY.slice(0, currentIndex + 1);
}
