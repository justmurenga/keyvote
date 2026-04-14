-- =============================================
-- Migration: 0017_add_wallet_transfers
-- Description: Add wallet transfer types and table
-- =============================================

-- Add new transaction types for wallet transfers
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'transfer_in';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'transfer_out';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'agent_payment';

-- Wallet transfers table (tracks transfers between wallets)
CREATE TABLE IF NOT EXISTS wallet_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sender and recipient
    sender_wallet_id UUID NOT NULL REFERENCES wallets(id),
    recipient_wallet_id UUID NOT NULL REFERENCES wallets(id),
    sender_user_id UUID NOT NULL REFERENCES users(id),
    recipient_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Transfer details
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    transfer_type VARCHAR(50) DEFAULT 'general', -- 'general', 'agent_payment', 'refund'
    
    -- Linked transactions (both sides)
    sender_transaction_id UUID REFERENCES wallet_transactions(id),
    recipient_transaction_id UUID REFERENCES wallet_transactions(id),
    
    -- For agent payments
    agent_id UUID REFERENCES agents(id),
    
    -- Status
    status transaction_status DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_wallet_transfers_sender ON wallet_transfers(sender_wallet_id);
CREATE INDEX idx_wallet_transfers_recipient ON wallet_transfers(recipient_wallet_id);
CREATE INDEX idx_wallet_transfers_sender_user ON wallet_transfers(sender_user_id);
CREATE INDEX idx_wallet_transfers_recipient_user ON wallet_transfers(recipient_user_id);
CREATE INDEX idx_wallet_transfers_agent ON wallet_transfers(agent_id);
CREATE INDEX idx_wallet_transfers_status ON wallet_transfers(status);
CREATE INDEX idx_wallet_transfers_created ON wallet_transfers(created_at);

-- Function to transfer between wallets
CREATE OR REPLACE FUNCTION transfer_between_wallets(
    p_sender_wallet_id UUID,
    p_recipient_wallet_id UUID,
    p_amount DECIMAL(12, 2),
    p_description TEXT,
    p_transfer_type VARCHAR(50) DEFAULT 'general',
    p_agent_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_sender_balance DECIMAL(12, 2);
    v_recipient_balance DECIMAL(12, 2);
    v_sender_new_balance DECIMAL(12, 2);
    v_recipient_new_balance DECIMAL(12, 2);
    v_sender_tx_id UUID;
    v_recipient_tx_id UUID;
    v_transfer_id UUID;
    v_sender_user_id UUID;
    v_recipient_user_id UUID;
    v_sender_frozen BOOLEAN;
    v_recipient_frozen BOOLEAN;
    v_tx_type transaction_type;
BEGIN
    -- Validate sender and recipient are different
    IF p_sender_wallet_id = p_recipient_wallet_id THEN
        RAISE EXCEPTION 'Cannot transfer to the same wallet';
    END IF;
    
    -- Get sender wallet info with lock
    SELECT balance, user_id, is_frozen INTO v_sender_balance, v_sender_user_id, v_sender_frozen
    FROM wallets WHERE id = p_sender_wallet_id FOR UPDATE;
    
    IF v_sender_frozen THEN
        RAISE EXCEPTION 'Sender wallet is frozen';
    END IF;
    
    -- Check sufficient balance
    IF v_sender_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    
    -- Get recipient wallet info with lock
    SELECT balance, user_id, is_frozen INTO v_recipient_balance, v_recipient_user_id, v_recipient_frozen
    FROM wallets WHERE id = p_recipient_wallet_id FOR UPDATE;
    
    IF v_recipient_frozen THEN
        RAISE EXCEPTION 'Recipient wallet is frozen';
    END IF;
    
    -- Calculate new balances
    v_sender_new_balance := v_sender_balance - p_amount;
    v_recipient_new_balance := v_recipient_balance + p_amount;
    
    -- Determine transaction type
    IF p_transfer_type = 'agent_payment' THEN
        v_tx_type := 'agent_payment';
    ELSE
        v_tx_type := 'transfer_out';
    END IF;
    
    -- Create sender transaction (debit)
    INSERT INTO wallet_transactions (
        wallet_id, type, amount, balance_before, balance_after,
        description, status, completed_at
    ) VALUES (
        p_sender_wallet_id, v_tx_type, -p_amount, v_sender_balance, v_sender_new_balance,
        p_description, 'completed', NOW()
    ) RETURNING id INTO v_sender_tx_id;
    
    -- Create recipient transaction (credit)
    INSERT INTO wallet_transactions (
        wallet_id, type, amount, balance_before, balance_after,
        description, status, completed_at
    ) VALUES (
        p_recipient_wallet_id, 'transfer_in', p_amount, v_recipient_balance, v_recipient_new_balance,
        p_description, 'completed', NOW()
    ) RETURNING id INTO v_recipient_tx_id;
    
    -- Update sender wallet
    UPDATE wallets
    SET balance = v_sender_new_balance,
        total_debited = total_debited + p_amount,
        updated_at = NOW()
    WHERE id = p_sender_wallet_id;
    
    -- Update recipient wallet
    UPDATE wallets
    SET balance = v_recipient_new_balance,
        total_credited = total_credited + p_amount,
        updated_at = NOW()
    WHERE id = p_recipient_wallet_id;
    
    -- Create transfer record
    INSERT INTO wallet_transfers (
        sender_wallet_id, recipient_wallet_id,
        sender_user_id, recipient_user_id,
        amount, description, transfer_type,
        sender_transaction_id, recipient_transaction_id,
        agent_id, status, completed_at
    ) VALUES (
        p_sender_wallet_id, p_recipient_wallet_id,
        v_sender_user_id, v_recipient_user_id,
        p_amount, p_description, p_transfer_type,
        v_sender_tx_id, v_recipient_tx_id,
        p_agent_id, 'completed', NOW()
    ) RETURNING id INTO v_transfer_id;
    
    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE wallet_transfers IS 'Tracks transfers between user wallets';
COMMENT ON FUNCTION transfer_between_wallets IS 'Atomically transfers funds between two wallets';
