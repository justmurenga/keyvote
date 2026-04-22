-- =============================================
-- Migration: 0034_create_user_entitlements
-- Description: Tracks which billable items a user/candidate has paid for
--              (prepaid model). Each successful wallet charge for a billable
--              item creates / increments an entitlement row that the user
--              can then "consume" or view.
-- =============================================

CREATE TABLE IF NOT EXISTS user_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Mirrors the id of an item in system_settings.billable_items
    -- (e.g. 'sms', 'bulk_sms_50', 'candidate_profile', 'subscription')
    item_id VARCHAR(64) NOT NULL,
    item_name TEXT NOT NULL,
    category VARCHAR(32),

    -- Prepaid pool: how many units remain to be consumed (NULL = unlimited
    -- until expiry, used for subscriptions / time-bound services).
    quantity_remaining INTEGER,
    quantity_total INTEGER,

    -- Cost the user actually paid (KES) and reference back to the wallet tx
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,

    -- Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'consumed', 'expired', 'revoked')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,

    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user ON user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_item ON user_entitlements(item_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_status ON user_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_item_active
    ON user_entitlements(user_id, item_id) WHERE status = 'active';

COMMENT ON TABLE user_entitlements IS
    'Prepaid entitlements: items a user has purchased from their wallet that they can view or consume.';

-- Helper: consume one unit from the oldest active entitlement of a given item
CREATE OR REPLACE FUNCTION consume_entitlement(
    p_user_id UUID,
    p_item_id VARCHAR(64)
) RETURNS UUID AS $$
DECLARE
    v_entitlement_id UUID;
BEGIN
    SELECT id INTO v_entitlement_id
    FROM user_entitlements
    WHERE user_id = p_user_id
      AND item_id = p_item_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (quantity_remaining IS NULL OR quantity_remaining > 0)
    ORDER BY granted_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_entitlement_id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE user_entitlements
    SET quantity_remaining = CASE
            WHEN quantity_remaining IS NULL THEN NULL
            ELSE quantity_remaining - 1
        END,
        last_used_at = NOW(),
        status = CASE
            WHEN quantity_remaining = 1 THEN 'consumed'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_entitlement_id;

    RETURN v_entitlement_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION trg_user_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_entitlements_updated_at ON user_entitlements;
CREATE TRIGGER user_entitlements_updated_at
    BEFORE UPDATE ON user_entitlements
    FOR EACH ROW
    EXECUTE FUNCTION trg_user_entitlements_updated_at();

-- RLS
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_entitlements_owner_select ON user_entitlements;
CREATE POLICY user_entitlements_owner_select
    ON user_entitlements FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_entitlements_admin_all ON user_entitlements;
CREATE POLICY user_entitlements_admin_all
    ON user_entitlements FOR ALL
    USING (is_system_admin(auth.uid()))
    WITH CHECK (is_system_admin(auth.uid()));
