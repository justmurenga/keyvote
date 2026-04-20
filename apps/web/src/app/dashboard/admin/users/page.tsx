'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { 
  ROLES, 
  ROLE_INFO, 
  PERMISSION_GROUPS,
  getRolePermissions,
  type Role 
} from '@/lib/auth/permissions';

interface User {
  id: string;
  phone: string;
  full_name: string;
  email: string | null;
  role: string;
  gender: string | null;
  age_bracket: string | null;
  id_number: string | null;
  bio: string | null;
  is_active: boolean;
  is_verified: boolean;
  profile_photo_url: string | null;
  county: { id: number; name: string } | null;
  constituency: { id: number; name: string } | null;
  ward: { id: number; name: string } | null;
  county_id: number | null;
  constituency_id: number | null;
  ward_id: number | null;
  created_at: string;
  last_login: string | null;
}

interface LocationOption {
  id: number;
  name: string;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const AGE_BRACKET_OPTIONS = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55-64', label: '55-64' },
  { value: '65+', label: '65+' },
];

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  roleCounts: Record<string, number>;
  availableRoles: string[];
  error?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { profile: currentUser, isLoading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  
  // Pagination
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  
  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [viewingPermissionsRole, setViewingPermissionsRole] = useState<Role | null>(null);
  
  // Create form
  const [createForm, setCreateForm] = useState<{
    phone: string;
    full_name: string;
    email: string;
    role: string;
    gender: string;
    age_bracket: string;
    id_number: string;
    bio: string;
    county_id: string;
    constituency_id: string;
    ward_id: string;
  }>({
    phone: '',
    full_name: '',
    email: '',
    role: ROLES.VOTER,
    gender: '',
    age_bracket: '',
    id_number: '',
    bio: '',
    county_id: '',
    constituency_id: '',
    ward_id: '',
  });

  // Edit form
  const [editForm, setEditForm] = useState<{
    full_name: string;
    email: string;
    gender: string;
    age_bracket: string;
    id_number: string;
    bio: string;
    county_id: string;
    constituency_id: string;
    ward_id: string;
    is_verified: boolean;
  }>({
    full_name: '',
    email: '',
    gender: '',
    age_bracket: '',
    id_number: '',
    bio: '',
    county_id: '',
    constituency_id: '',
    ward_id: '',
    is_verified: false,
  });

  // Location data
  const [counties, setCounties] = useState<LocationOption[]>([]);
  const [constituencies, setConstituencies] = useState<LocationOption[]>([]);
  const [wards, setWards] = useState<LocationOption[]>([]);
  const [editConstituencies, setEditConstituencies] = useState<LocationOption[]>([]);
  const [editWards, setEditWards] = useState<LocationOption[]>([]);

  const searchRef = useRef(search);
  searchRef.current = search;

  // Fetch counties on mount
  useEffect(() => {
    const fetchCounties = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;
        const res = await fetch(`${supabaseUrl}/rest/v1/counties?select=id,name&order=name`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
        if (res.ok) setCounties(await res.json());
      } catch {}
    };
    fetchCounties();
  }, []);

  const fetchConstituencies = async (countyId: string, target: 'create' | 'edit') => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey || !countyId) {
        target === 'create' ? setConstituencies([]) : setEditConstituencies([]);
        return;
      }
      const res = await fetch(`${supabaseUrl}/rest/v1/constituencies?select=id,name&county_id=eq.${countyId}&order=name`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        target === 'create' ? setConstituencies(data) : setEditConstituencies(data);
      }
    } catch {}
  };

  const fetchWards = async (constituencyId: string, target: 'create' | 'edit') => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey || !constituencyId) {
        target === 'create' ? setWards([]) : setEditWards([]);
        return;
      }
      const res = await fetch(`${supabaseUrl}/rest/v1/wards?select=id,name&constituency_id=eq.${constituencyId}&order=name`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        target === 'create' ? setWards(data) : setEditWards(data);
      }
    } catch {}
  };

  // Initialize edit form when editing user changes
  useEffect(() => {
    if (editingUser) {
      setEditForm({
        full_name: editingUser.full_name || '',
        email: editingUser.email || '',
        gender: editingUser.gender || '',
        age_bracket: editingUser.age_bracket || '',
        id_number: editingUser.id_number || '',
        bio: editingUser.bio || '',
        county_id: editingUser.county_id?.toString() || editingUser.county?.id?.toString() || '',
        constituency_id: editingUser.constituency_id?.toString() || editingUser.constituency?.id?.toString() || '',
        ward_id: editingUser.ward_id?.toString() || editingUser.ward?.id?.toString() || '',
        is_verified: editingUser.is_verified,
      });
      // Load constituencies/wards for existing location
      const cId = editingUser.county_id?.toString() || editingUser.county?.id?.toString();
      if (cId) fetchConstituencies(cId, 'edit');
      const conId = editingUser.constituency_id?.toString() || editingUser.constituency?.id?.toString();
      if (conId) fetchWards(conId, 'edit');
    }
  }, [editingUser]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (searchRef.current) params.set('search', searchRef.current);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      const data: UsersResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setRoleCounts(data.roleCounts);
      setAvailableRoles(data.availableRoles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchUsers();
    }
  }, [fetchUsers, authLoading, currentUser]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleChangeRole = async () => {
    if (!selectedUserForRole || !newRole) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUserForRole.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role');
      }

      setSuccess(data.message);
      setShowRoleModal(false);
      setSelectedUserForRole(null);
      setNewRole('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, any> = {
        phone: createForm.phone,
        full_name: createForm.full_name,
        email: createForm.email || undefined,
        role: createForm.role,
      };
      if (createForm.gender) payload.gender = createForm.gender;
      if (createForm.age_bracket) payload.age_bracket = createForm.age_bracket;
      if (createForm.id_number) payload.id_number = createForm.id_number;
      if (createForm.bio) payload.bio = createForm.bio;
      if (createForm.county_id) payload.county_id = createForm.county_id;
      if (createForm.constituency_id) payload.constituency_id = createForm.constituency_id;
      if (createForm.ward_id) payload.ward_id = createForm.ward_id;

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess('User created successfully');
      setShowCreateModal(false);
      setCreateForm({ phone: '', full_name: '', email: '', role: ROLES.VOTER, gender: '', age_bracket: '', id_number: '', bio: '', county_id: '', constituency_id: '', ward_id: '' });
      setConstituencies([]);
      setWards([]);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      setSuccess(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      system_admin: 'bg-red-100 text-red-800 border-red-200',
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      party_admin: 'bg-blue-100 text-blue-800 border-blue-200',
      candidate: 'bg-green-100 text-green-800 border-green-200',
      agent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      voter: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[role] || colors.voter;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!currentUser || !currentUser.role || !['admin', 'system_admin'].includes(currentUser.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setViewingPermissionsRole(null);
                setShowPermissionsModal(true);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              View Permissions
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">×</button>
          </div>
        )}

        {/* Role Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Object.entries(ROLE_INFO).map(([role, info]) => (
            <div
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                roleFilter === role ? 'ring-2 ring-green-500 border-green-500' : 'hover:border-gray-300'
              } bg-white`}
            >
              <div className="text-2xl font-bold text-gray-900">{roleCounts[role] || 0}</div>
              <div className="text-sm text-gray-600">{info.label}s</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Roles</option>
              {Object.entries(ROLE_INFO).map(([role, info]) => (
                <option key={role} value={role}>{info.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="verified">Phone Verified</option>
              <option value="unverified">Phone Not Verified</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {user.profile_photo_url ? (
                              <img className="h-10 w-10 rounded-full" src={user.profile_photo_url} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-green-600 font-medium">
                                  {user.full_name?.charAt(0) || 'U'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-sm text-gray-500">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.phone}</div>
                        <div className="text-sm text-gray-500">{user.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {ROLE_INFO[user.role as Role]?.label || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.county?.name || '-'}
                        {user.constituency && `, ${user.constituency.name}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {user.is_verified && (
                            <span className="text-green-500" title="Phone Verified">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserForRole(user);
                              setNewRole(user.role);
                              setShowRoleModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Change Role"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit User"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {user.is_active ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(page * 20, total)}</span> of{' '}
                    <span className="font-medium">{total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      «
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      »
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      »»
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Role Modal */}
        {showRoleModal && selectedUserForRole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Change Role for {selectedUserForRole.full_name}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Role</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(selectedUserForRole.role)}`}>
                    {ROLE_INFO[selectedUserForRole.role as Role]?.label || selectedUserForRole.role}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_INFO[role as Role]?.label || role}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {ROLE_INFO[newRole as Role]?.description}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUserForRole(null);
                    setNewRole('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeRole}
                  disabled={newRole === selectedUserForRole.role}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Change Role
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Basic Info Section */}
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="0712345678"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={createForm.full_name}
                        onChange={(e) => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                      <input
                        type="text"
                        value={createForm.id_number}
                        onChange={(e) => setCreateForm(f => ({ ...f, id_number: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="National ID number"
                      />
                    </div>
                  </div>
                </div>

                {/* Role & Demographics Section */}
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Role & Demographics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={createForm.role}
                        onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        {availableRoles.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_INFO[role as Role]?.label || role}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">{ROLE_INFO[createForm.role as Role]?.description}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        value={createForm.gender}
                        onChange={(e) => setCreateForm(f => ({ ...f, gender: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select gender</option>
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age Bracket</label>
                      <select
                        value={createForm.age_bracket}
                        onChange={(e) => setCreateForm(f => ({ ...f, age_bracket: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select age bracket</option>
                        {AGE_BRACKET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Location</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                      <select
                        value={createForm.county_id}
                        onChange={(e) => {
                          setCreateForm(f => ({ ...f, county_id: e.target.value, constituency_id: '', ward_id: '' }));
                          fetchConstituencies(e.target.value, 'create');
                          setWards([]);
                        }}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select county</option>
                        {counties.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Constituency</label>
                      <select
                        value={createForm.constituency_id}
                        onChange={(e) => {
                          setCreateForm(f => ({ ...f, constituency_id: e.target.value, ward_id: '' }));
                          fetchWards(e.target.value, 'create');
                        }}
                        disabled={!createForm.county_id}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                      >
                        <option value="">Select constituency</option>
                        {constituencies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                      <select
                        value={createForm.ward_id}
                        onChange={(e) => setCreateForm(f => ({ ...f, ward_id: e.target.value }))}
                        disabled={!createForm.constituency_id}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                      >
                        <option value="">Select ward</option>
                        {wards.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={createForm.bio}
                    onChange={(e) => setCreateForm(f => ({ ...f, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Brief description about the user..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit User: {editingUser.full_name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(editingUser.role)}`}>
                  {ROLE_INFO[editingUser.role as Role]?.label || editingUser.role}
                </span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const updates: Record<string, any> = {
                    full_name: editForm.full_name,
                    email: editForm.email || null,
                    is_verified: editForm.is_verified,
                  };
                  if (editForm.gender) updates.gender = editForm.gender;
                  if (editForm.age_bracket) updates.age_bracket = editForm.age_bracket;
                  if (editForm.id_number) updates.id_number = editForm.id_number;
                  updates.bio = editForm.bio || null;
                  if (editForm.county_id) updates.county_id = editForm.county_id;
                  if (editForm.constituency_id) updates.constituency_id = editForm.constituency_id;
                  if (editForm.ward_id) updates.ward_id = editForm.ward_id;
                  handleUpdateUser(editingUser.id, updates as Partial<User>);
                }}
                className="space-y-4"
              >
                {/* Basic Info Section */}
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={editingUser.phone}
                        disabled
                        className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                      <input
                        type="text"
                        value={editForm.id_number}
                        onChange={(e) => setEditForm(f => ({ ...f, id_number: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="National ID number"
                      />
                    </div>
                  </div>
                </div>

                {/* Demographics Section */}
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Demographics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        value={editForm.gender}
                        onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select gender</option>
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age Bracket</label>
                      <select
                        value={editForm.age_bracket}
                        onChange={(e) => setEditForm(f => ({ ...f, age_bracket: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select age bracket</option>
                        {AGE_BRACKET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.is_verified}
                          onChange={(e) => setEditForm(f => ({ ...f, is_verified: e.target.checked }))}
                          className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Phone Verified</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Location</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                      <select
                        value={editForm.county_id}
                        onChange={(e) => {
                          setEditForm(f => ({ ...f, county_id: e.target.value, constituency_id: '', ward_id: '' }));
                          fetchConstituencies(e.target.value, 'edit');
                          setEditWards([]);
                        }}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select county</option>
                        {counties.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Constituency</label>
                      <select
                        value={editForm.constituency_id}
                        onChange={(e) => {
                          setEditForm(f => ({ ...f, constituency_id: e.target.value, ward_id: '' }));
                          fetchWards(e.target.value, 'edit');
                        }}
                        disabled={!editForm.county_id}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                      >
                        <option value="">Select constituency</option>
                        {editConstituencies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                      <select
                        value={editForm.ward_id}
                        onChange={(e) => setEditForm(f => ({ ...f, ward_id: e.target.value }))}
                        disabled={!editForm.constituency_id}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                      >
                        <option value="">Select ward</option>
                        {editWards.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Brief description about the user..."
                  />
                </div>

                {/* Meta Info */}
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                  <div className="flex gap-4">
                    <span>Joined: {new Date(editingUser.created_at).toLocaleDateString()}</span>
                    <span>Last Login: {editingUser.last_login ? new Date(editingUser.last_login).toLocaleDateString() : 'Never'}</span>
                    <span>Status: {editingUser.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permissions Modal */}
        {showPermissionsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Roles & Permissions</h3>
                  <button
                    onClick={() => setShowPermissionsModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  <button
                    onClick={() => setViewingPermissionsRole(null)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      !viewingPermissionsRole ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Overview
                  </button>
                  {Object.entries(ROLE_INFO).map(([role, info]) => (
                    <button
                      key={role}
                      onClick={() => setViewingPermissionsRole(role as Role)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        viewingPermissionsRole === role ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {!viewingPermissionsRole ? (
                  <div className="space-y-6">
                    <p className="text-gray-600">
                      The system uses Role-Based Access Control (RBAC) to manage user permissions. 
                      Each role has a set of permissions that determine what actions a user can perform.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(ROLE_INFO).map(([role, info]) => {
                        const permissions = getRolePermissions(role as Role);
                        return (
                          <div key={role} className="border rounded-lg p-4">
                            <h4 className="font-semibold text-lg">{info.label}</h4>
                            <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                            <div className="mt-3 text-sm text-gray-500">
                              {permissions.length} permissions
                            </div>
                            <button
                              onClick={() => setViewingPermissionsRole(role as Role)}
                              className="text-green-600 text-sm mt-2 hover:underline"
                            >
                              View permissions →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-lg">{ROLE_INFO[viewingPermissionsRole].label}</h4>
                      <p className="text-gray-600">{ROLE_INFO[viewingPermissionsRole].description}</p>
                    </div>
                    {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => {
                      const rolePermissions = getRolePermissions(viewingPermissionsRole);
                      const groupPermissions = permissions.filter(p => rolePermissions.includes(p));
                      
                      if (groupPermissions.length === 0) return null;
                      
                      return (
                        <div key={group}>
                          <h5 className="font-medium text-gray-900 mb-2 capitalize">{group.replace('_', ' ')}</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {groupPermissions.map((permission) => (
                              <div
                                key={permission}
                                className="flex items-center gap-2 text-sm text-gray-600"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span>{permission.replace(/_/g, ' ').replace(group.toUpperCase() + ' ', '')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
