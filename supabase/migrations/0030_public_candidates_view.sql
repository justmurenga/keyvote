-- ============================================================================
-- Migration: 0030 — Allow public browsing of all active candidates
-- Description:
--   Previously, the candidates SELECT policy restricted visibility to:
--     - Candidates within the viewer's electoral line
--     - The candidate themselves
--     - System admins
--   This caused the public "/candidates" directory to show "No candidates found"
--   for unauthenticated visitors and to hide candidates outside the user's
--   county/constituency/ward (e.g. presidential candidates would also be hidden
--   for users who hadn't completed their voter location).
--
--   This migration replaces that policy with a simple public-read policy that
--   exposes any active candidate to everyone (anon + authenticated). The
--   candidate's `is_active` flag (and admin verification flow) remains the
--   gating mechanism for visibility.
-- ============================================================================

DROP POLICY IF EXISTS "Candidates in electoral line are viewable" ON candidates;

CREATE POLICY "Active candidates are publicly viewable"
    ON candidates FOR SELECT
    USING (
        is_active = true
        OR user_id = auth.uid()
        OR is_system_admin(auth.uid())
    );
