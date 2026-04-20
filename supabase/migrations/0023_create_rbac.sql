-- ============================================================================
-- Migration: 0023 — Role-Based Access Control (RBAC)
-- Description: Replaces the flat user_role enum with a proper RBAC system
--              that supports scoped role assignments (per-party, per-region)
--              and granular permissions.
-- ============================================================================

-- ============================================================================
-- 1. PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,        -- e.g. 'manage_party_members'
  description TEXT,
  category VARCHAR(50) NOT NULL,            -- e.g. 'party', 'election', 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE permissions IS 'Granular permission definitions for the RBAC system';

-- ============================================================================
-- 2. ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,        -- e.g. 'party_chairman', 'election_officer'
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  -- scope_type defines what this role can be scoped to
  scope_type VARCHAR(20) NOT NULL DEFAULT 'global'
    CHECK (scope_type IN ('global', 'party', 'region')),
  is_system BOOLEAN DEFAULT FALSE,          -- system roles can't be deleted
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Named roles that bundle permissions together';

-- ============================================================================
-- 3. ROLE ↔ PERMISSIONS MAPPING
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Maps which permissions belong to which role';

-- ============================================================================
-- 4. USER ROLE ASSIGNMENTS (scoped)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  -- Scope: which party / region this role applies to (NULL = global)
  party_id UUID REFERENCES political_parties(id) ON DELETE CASCADE,
  region_type region_type,
  region_id UUID,                           -- county_id, constituency_id, ward_id, etc.

  -- Assignment metadata
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                   -- optional expiry
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A user can only hold a given role once per scope (expression index)
CREATE UNIQUE INDEX idx_ura_unique_scope
  ON user_role_assignments (user_id, role_id, COALESCE(party_id, '00000000-0000-0000-0000-000000000000'), COALESCE(region_id, '00000000-0000-0000-0000-000000000000'))
  WHERE is_active = true;

CREATE INDEX idx_ura_user ON user_role_assignments(user_id) WHERE is_active = true;
CREATE INDEX idx_ura_party ON user_role_assignments(party_id) WHERE is_active = true;
CREATE INDEX idx_ura_role ON user_role_assignments(role_id) WHERE is_active = true;

COMMENT ON TABLE user_role_assignments IS 'Assigns a role to a user, scoped to a party or region';

-- ============================================================================
-- 5. AUDIT LOG for role changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(20) NOT NULL CHECK (action IN ('assign', 'revoke', 'expire', 'update')),
  user_role_assignment_id UUID REFERENCES user_role_assignments(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  party_id UUID REFERENCES political_parties(id),
  performed_by UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ral_target ON role_audit_log(target_user_id);
CREATE INDEX idx_ral_performer ON role_audit_log(performed_by);

-- ============================================================================
-- 6. SEED PERMISSIONS
-- ============================================================================
INSERT INTO permissions (code, description, category) VALUES
  -- Party management
  ('manage_party_profile',    'Create and edit party profile details',         'party'),
  ('manage_party_members',    'Add, remove, update party members',             'party'),
  ('manage_party_officials',  'Assign party official roles',                   'party'),
  ('approve_nominations',     'Approve or reject candidate nominations',       'party'),
  ('manage_party_fees',       'Set and manage party nomination fees',          'party'),
  ('view_party_finances',     'View party financial reports',                  'party'),

  -- Candidate / Election
  ('manage_candidates',       'Register and manage candidates',                'election'),
  ('manage_agents',           'Assign and manage election agents',             'election'),
  ('submit_results',          'Submit election results',                       'election'),
  ('verify_results',          'Verify and approve election results',           'election'),
  ('manage_polls',            'Create and manage polls',                       'election'),

  -- System
  ('manage_users',            'View and manage all user accounts',             'system'),
  ('manage_roles',            'Create roles and assign permissions',           'system'),
  ('manage_system_settings',  'Manage global system configuration',            'system'),
  ('manage_vying_fees',       'Set and manage candidate vying fees',           'system'),
  ('view_audit_logs',         'View system audit logs',                        'system'),
  ('manage_wallets',          'Manage user wallets and transactions',          'system'),
  ('send_notifications',      'Send system-wide notifications',               'system'),
  ('view_reports',            'View system-wide reports and analytics',        'system')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 7. SEED DEFAULT ROLES
-- ============================================================================

-- System-level roles
INSERT INTO roles (name, display_name, description, scope_type, is_system) VALUES
  ('super_admin',      'Super Administrator',    'Full system access',                              'global', true),
  ('system_admin',     'System Administrator',   'Manage system settings, users, and fees',         'global', true),
  ('election_officer', 'Election Officer',       'Manage elections, results verification',          'region', true),
  ('voter',            'Voter',                  'Default role for all registered users',           'global', true)
ON CONFLICT (name) DO NOTHING;

-- Party-scoped roles
INSERT INTO roles (name, display_name, description, scope_type, is_system) VALUES
  ('party_leader',     'Party Leader',           'Overall party leadership',                        'party', true),
  ('party_chairman',   'Party Chairman',         'Party chairman with admin privileges',            'party', true),
  ('party_secretary',  'Party Secretary General', 'Party secretary with member management',         'party', true),
  ('party_treasurer',  'Party Treasurer',        'Party financial management',                      'party', true),
  ('party_official',   'Party Official',         'General party official',                          'party', true),
  ('party_candidate',  'Party Candidate',        'Candidate nominated by this party',               'party', true),
  ('party_agent',      'Party Agent',            'Election agent for this party',                   'party', true),
  ('party_member',     'Party Member',           'Ordinary party member',                           'party', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 8. SEED ROLE → PERMISSION MAPPINGS
-- ============================================================================

-- Super admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- System admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'system_admin'
  AND p.code IN (
    'manage_users', 'manage_roles', 'manage_system_settings',
    'manage_vying_fees', 'view_audit_logs', 'manage_wallets',
    'send_notifications', 'view_reports', 'manage_candidates',
    'manage_polls', 'verify_results'
  )
ON CONFLICT DO NOTHING;

-- Election officer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'election_officer'
  AND p.code IN ('submit_results', 'verify_results', 'manage_agents', 'view_reports')
ON CONFLICT DO NOTHING;

-- Party chairman — full party control
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'party_chairman'
  AND p.code IN (
    'manage_party_profile', 'manage_party_members', 'manage_party_officials',
    'approve_nominations', 'manage_party_fees', 'view_party_finances',
    'manage_candidates', 'manage_agents'
  )
ON CONFLICT DO NOTHING;

-- Party secretary
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'party_secretary'
  AND p.code IN (
    'manage_party_members', 'manage_party_officials',
    'approve_nominations', 'manage_candidates'
  )
ON CONFLICT DO NOTHING;

-- Party treasurer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'party_treasurer'
  AND p.code IN ('manage_party_fees', 'view_party_finances')
ON CONFLICT DO NOTHING;

-- Party official
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'party_official'
  AND p.code IN ('manage_party_members', 'manage_candidates')
ON CONFLICT DO NOTHING;

-- Party agent
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'party_agent'
  AND p.code IN ('submit_results')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Check if a user has a specific permission (optionally scoped to a party)
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code VARCHAR,
  p_party_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN role_permissions rp ON rp.role_id = ura.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ura.user_id = p_user_id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
      AND p.code = p_permission_code
      AND (
        -- Global roles always apply
        ura.party_id IS NULL
        -- Party-scoped roles apply if the scope matches
        OR ura.party_id = p_party_id
      )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is a system-level admin (super_admin or system_admin)
CREATE OR REPLACE FUNCTION is_system_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
      AND r.name IN ('super_admin', 'system_admin')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is an admin for a specific party
CREATE OR REPLACE FUNCTION is_party_admin(p_user_id UUID, p_party_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
      AND ura.party_id = p_party_id
      AND r.name IN ('party_leader', 'party_chairman', 'party_secretary')
  )
  -- System admins are implicitly party admins everywhere
  OR is_system_admin(p_user_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 10. ADMIN FUNCTION: Assign a role to a user
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_user_role(
  p_target_user_id UUID,
  p_role_name VARCHAR,
  p_party_id UUID DEFAULT NULL,
  p_region_type region_type DEFAULT NULL,
  p_region_id UUID DEFAULT NULL,
  p_assigned_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_role_id UUID;
  v_role_scope VARCHAR;
  v_assignment_id UUID;
  v_assigner UUID := COALESCE(p_assigned_by, auth.uid());
BEGIN
  -- Validate role exists
  SELECT id, scope_type INTO v_role_id, v_role_scope FROM roles WHERE name = p_role_name AND is_active = true;
  IF v_role_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role not found: ' || p_role_name);
  END IF;

  -- Validate scope
  IF v_role_scope = 'party' AND p_party_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Party-scoped role requires a party_id');
  END IF;
  IF v_role_scope = 'region' AND (p_region_type IS NULL OR p_region_id IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Region-scoped role requires region_type and region_id');
  END IF;

  -- Check the assigner has permission to manage roles
  IF NOT is_system_admin(v_assigner) THEN
    -- Party admins can assign party-scoped roles within their party
    IF v_role_scope = 'party' AND p_party_id IS NOT NULL THEN
      IF NOT is_party_admin(v_assigner, p_party_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to assign roles in this party');
      END IF;
      -- Party admins cannot assign system roles
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Only system admins can assign this role');
    END IF;
  END IF;

  -- Upsert the assignment
  -- Try to find existing (active or inactive) assignment for this scope
  SELECT id INTO v_assignment_id
  FROM user_role_assignments
  WHERE user_id = p_target_user_id
    AND role_id = v_role_id
    AND COALESCE(party_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_party_id, '00000000-0000-0000-0000-000000000000')
    AND COALESCE(region_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_region_id, '00000000-0000-0000-0000-000000000000')
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    UPDATE user_role_assignments
    SET is_active = true, assigned_by = v_assigner, expires_at = p_expires_at, notes = p_notes, updated_at = NOW()
    WHERE id = v_assignment_id;
  ELSE
    INSERT INTO user_role_assignments (user_id, role_id, party_id, region_type, region_id, assigned_by, expires_at, notes, is_active)
    VALUES (p_target_user_id, v_role_id, p_party_id, p_region_type, p_region_id, v_assigner, p_expires_at, p_notes, true)
    RETURNING id INTO v_assignment_id;
  END IF;

  -- Audit log
  INSERT INTO role_audit_log (action, user_role_assignment_id, target_user_id, role_id, party_id, performed_by, reason)
  VALUES ('assign', v_assignment_id, p_target_user_id, v_role_id, p_party_id, v_assigner, p_notes);

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_assignment_id,
    'role', p_role_name,
    'target_user', p_target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. ADMIN FUNCTION: Revoke a role from a user
-- ============================================================================
CREATE OR REPLACE FUNCTION revoke_user_role(
  p_target_user_id UUID,
  p_role_name VARCHAR,
  p_party_id UUID DEFAULT NULL,
  p_revoked_by UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_role_id UUID;
  v_assignment_id UUID;
  v_revoker UUID := COALESCE(p_revoked_by, auth.uid());
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = p_role_name;
  IF v_role_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role not found');
  END IF;

  -- Deactivate the assignment
  UPDATE user_role_assignments
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_target_user_id
    AND role_id = v_role_id
    AND (party_id = p_party_id OR (party_id IS NULL AND p_party_id IS NULL))
    AND is_active = true
  RETURNING id INTO v_assignment_id;

  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active assignment not found');
  END IF;

  -- Audit log
  INSERT INTO role_audit_log (action, user_role_assignment_id, target_user_id, role_id, party_id, performed_by, reason)
  VALUES ('revoke', v_assignment_id, p_target_user_id, v_role_id, p_party_id, v_revoker, p_reason);

  RETURN jsonb_build_object('success', true, 'revoked_assignment', v_assignment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. VIEW: Convenient user permissions view
-- ============================================================================
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT
  ura.user_id,
  u.full_name,
  r.name AS role_name,
  r.display_name AS role_display_name,
  r.scope_type,
  ura.party_id,
  pp.name AS party_name,
  ura.region_type,
  ura.region_id,
  p.code AS permission_code,
  p.description AS permission_description,
  p.category AS permission_category,
  ura.is_active,
  ura.expires_at,
  ura.assigned_at
FROM user_role_assignments ura
JOIN users u ON u.id = ura.user_id
JOIN roles r ON r.id = ura.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
LEFT JOIN political_parties pp ON pp.id = ura.party_id
WHERE ura.is_active = true
  AND (ura.expires_at IS NULL OR ura.expires_at > NOW());

-- ============================================================================
-- 13. RLS POLICIES
-- ============================================================================
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

-- Permissions & roles are publicly readable
CREATE POLICY "Anyone can view permissions" ON permissions FOR SELECT USING (true);
CREATE POLICY "Anyone can view roles" ON roles FOR SELECT USING (true);
CREATE POLICY "Anyone can view role_permissions" ON role_permissions FOR SELECT USING (true);

-- Only system admins can modify permissions/roles/mappings
CREATE POLICY "System admins manage permissions" ON permissions FOR ALL
  USING (is_system_admin(auth.uid()));
CREATE POLICY "System admins manage roles" ON roles FOR ALL
  USING (is_system_admin(auth.uid()));
CREATE POLICY "System admins manage role_permissions" ON role_permissions FOR ALL
  USING (is_system_admin(auth.uid()));

-- Users can see their own role assignments; admins can see all
CREATE POLICY "Users view own role assignments" ON user_role_assignments FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_system_admin(auth.uid())
    -- Party admins can see assignments in their party
    OR (party_id IS NOT NULL AND is_party_admin(auth.uid(), party_id))
  );
CREATE POLICY "Admins manage role assignments" ON user_role_assignments FOR ALL
  USING (is_system_admin(auth.uid()) OR (party_id IS NOT NULL AND is_party_admin(auth.uid(), party_id)));

-- Audit log: system admins only
CREATE POLICY "System admins view audit log" ON role_audit_log FOR SELECT
  USING (is_system_admin(auth.uid()));
CREATE POLICY "System inserts audit log" ON role_audit_log FOR INSERT
  WITH CHECK (true); -- inserted by SECURITY DEFINER functions only

-- ============================================================================
-- 14. MIGRATE EXISTING user_role DATA
--     Maps the old flat `users.role` to new role assignments
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  v_role_id UUID;
BEGIN
  FOR r IN SELECT id, role FROM users WHERE role IS NOT NULL LOOP
    -- Map old role names to new role names
    CASE r.role::text
      WHEN 'system_admin' THEN
        SELECT id INTO v_role_id FROM roles WHERE name = 'system_admin';
      WHEN 'party_admin' THEN
        -- party_admin without scope → assign as party_chairman for each party they belong to
        FOR v_role_id IN SELECT roles.id FROM roles WHERE name = 'party_chairman' LOOP
          INSERT INTO user_role_assignments (user_id, role_id, party_id, assigned_by, notes)
          SELECT r.id, v_role_id, pm.party_id, r.id, 'Migrated from legacy user_role=party_admin'
          FROM party_members pm
          WHERE pm.user_id = r.id AND pm.is_active = true
          ON CONFLICT DO NOTHING;
        END LOOP;
        CONTINUE; -- skip the generic insert below
      WHEN 'candidate' THEN
        SELECT id INTO v_role_id FROM roles WHERE name = 'voter';
        -- Candidates get voter role globally; their candidacy is tracked in candidates table
      WHEN 'agent' THEN
        SELECT id INTO v_role_id FROM roles WHERE name = 'voter';
        -- Agents get voter role globally; their agent status is tracked in agents table
      ELSE -- 'voter' or anything else
        SELECT id INTO v_role_id FROM roles WHERE name = 'voter';
    END CASE;

    IF v_role_id IS NOT NULL THEN
      INSERT INTO user_role_assignments (user_id, role_id, assigned_by, notes)
      VALUES (r.id, v_role_id, r.id, 'Migrated from legacy user_role=' || r.role::text)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Done. The old `users.role` column is kept for backward compatibility.
-- A future migration should remove it once the app fully uses the RBAC system.
-- ============================================================================
