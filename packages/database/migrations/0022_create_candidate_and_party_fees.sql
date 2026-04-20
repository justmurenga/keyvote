-- ============================================================================
-- Migration: Candidate Vying Fees & Party Nomination Fees
-- Description: Fee schedules for candidates vying at different levels
--              and for parties conducting nominations
-- ============================================================================

-- Candidate vying fees by position level
CREATE TABLE IF NOT EXISTS candidate_vying_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position electoral_position NOT NULL UNIQUE,
  fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Party nomination fees by position level
CREATE TABLE IF NOT EXISTS party_nomination_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position electoral_position NOT NULL UNIQUE,
  fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate fee payments (tracks who paid what)
CREATE TABLE IF NOT EXISTS candidate_fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  user_id UUID NOT NULL REFERENCES users(id),
  fee_type TEXT NOT NULL CHECK (fee_type IN ('vying', 'nomination')),
  position electoral_position NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),
  party_id UUID REFERENCES political_parties(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new transaction type values
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'candidate_vying_fee';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'party_nomination_fee';

-- Seed default candidate vying fees (Kenyan context)
INSERT INTO candidate_vying_fees (position, fee_amount, description) VALUES
  ('president',   5000000, 'Presidential candidate vying fee'),
  ('governor',    2000000, 'Governor candidate vying fee'),
  ('senator',     1000000, 'Senator candidate vying fee'),
  ('women_rep',    500000, 'Women Representative candidate vying fee'),
  ('mp',           500000, 'Member of Parliament candidate vying fee'),
  ('mca',          100000, 'Member of County Assembly (MCA) candidate vying fee')
ON CONFLICT (position) DO NOTHING;

-- Seed default party nomination fees
INSERT INTO party_nomination_fees (position, fee_amount, description) VALUES
  ('president',   2000000, 'Party nomination fee for Presidential candidate'),
  ('governor',    1000000, 'Party nomination fee for Governor candidate'),
  ('senator',      500000, 'Party nomination fee for Senator candidate'),
  ('women_rep',    250000, 'Party nomination fee for Women Representative candidate'),
  ('mp',           250000, 'Party nomination fee for MP candidate'),
  ('mca',           50000, 'Party nomination fee for MCA candidate')
ON CONFLICT (position) DO NOTHING;

-- Enable RLS
ALTER TABLE candidate_vying_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_nomination_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_fee_payments ENABLE ROW LEVEL SECURITY;

-- Public read for fee schedules
CREATE POLICY "Anyone can view vying fees" ON candidate_vying_fees FOR SELECT USING (true);
CREATE POLICY "Anyone can view nomination fees" ON party_nomination_fees FOR SELECT USING (true);

-- Admin-only write for fee schedules
CREATE POLICY "Admins can manage vying fees" ON candidate_vying_fees FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('party_admin', 'system_admin')));
CREATE POLICY "Admins can manage nomination fees" ON party_nomination_fees FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('party_admin', 'system_admin')));

-- Payments visible to the user themselves or admins
CREATE POLICY "Users can view own fee payments" ON candidate_fee_payments FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('party_admin', 'system_admin')));
CREATE POLICY "Admins can manage fee payments" ON candidate_fee_payments FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('party_admin', 'system_admin')));

-- Function to process candidate vying fee payment from wallet
CREATE OR REPLACE FUNCTION pay_candidate_vying_fee(
  p_candidate_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_position electoral_position;
  v_fee DECIMAL(12,2);
  v_wallet_id UUID;
  v_balance DECIMAL(12,2);
  v_tx_id UUID;
  v_payment_id UUID;
BEGIN
  -- Get candidate position
  SELECT position INTO v_position FROM candidates WHERE id = p_candidate_id;
  IF v_position IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Candidate not found');
  END IF;

  -- Get fee amount
  SELECT fee_amount INTO v_fee FROM candidate_vying_fees WHERE position = v_position AND is_active = true;
  IF v_fee IS NULL OR v_fee <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active fee for this position');
  END IF;

  -- Check if already paid
  IF EXISTS (SELECT 1 FROM candidate_fee_payments WHERE candidate_id = p_candidate_id AND fee_type = 'vying' AND status = 'paid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vying fee already paid');
  END IF;

  -- Get wallet and check balance
  SELECT id, balance INTO v_wallet_id, v_balance FROM wallets WHERE user_id = p_user_id;
  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  IF v_balance < v_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance', 'required', v_fee, 'available', v_balance);
  END IF;

  -- Debit wallet
  UPDATE wallets SET balance = balance - v_fee, updated_at = NOW() WHERE id = v_wallet_id;

  -- Create wallet transaction
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, status)
  VALUES (v_wallet_id, 'candidate_vying_fee', v_fee, 'Candidate vying fee for ' || v_position::text, 'completed')
  RETURNING id INTO v_tx_id;

  -- Record payment
  INSERT INTO candidate_fee_payments (candidate_id, user_id, fee_type, position, amount, wallet_transaction_id, status, paid_at)
  VALUES (p_candidate_id, p_user_id, 'vying', v_position, v_fee, v_tx_id, 'paid', NOW())
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'amount', v_fee, 'position', v_position);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
