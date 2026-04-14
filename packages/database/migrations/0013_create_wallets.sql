-- =============================================
-- Migration: 0013_create_wallets
-- Description: Create wallet and payment tables
-- =============================================

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    balance DECIMAL(12, 2) DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'KES',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_frozen BOOLEAN DEFAULT FALSE,
    frozen_reason TEXT,
    
    -- Totals (for quick access)
    total_credited DECIMAL(14, 2) DEFAULT 0.00,
    total_debited DECIMAL(14, 2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    
    -- Transaction details
    type transaction_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    
    description TEXT,
    reference VARCHAR(100), -- Internal reference
    external_reference VARCHAR(100), -- M-Pesa receipt, etc.
    
    -- Status
    status transaction_status DEFAULT 'pending',
    
    -- M-Pesa specific fields
    mpesa_receipt_number VARCHAR(50),
    mpesa_transaction_date TIMESTAMPTZ,
    mpesa_phone_number VARCHAR(15),
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- M-Pesa STK Push requests (for tracking)
CREATE TABLE IF NOT EXISTS mpesa_stk_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    
    -- Request details
    phone_number VARCHAR(15) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    
    -- M-Pesa identifiers
    merchant_request_id VARCHAR(100),
    checkout_request_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'cancelled'
    result_code VARCHAR(10),
    result_description TEXT,
    
    -- Linked transaction
    transaction_id UUID REFERENCES wallet_transactions(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- M-Pesa B2C disbursements
CREATE TABLE IF NOT EXISTS mpesa_disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_wallet_id UUID NOT NULL REFERENCES wallets(id),
    
    -- Recipient details
    recipient_phone VARCHAR(15) NOT NULL,
    recipient_name VARCHAR(200),
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    
    -- M-Pesa identifiers
    conversation_id VARCHAR(100),
    originator_conversation_id VARCHAR(100),
    
    -- Status
    status transaction_status DEFAULT 'pending',
    mpesa_receipt_number VARCHAR(50),
    result_code VARCHAR(10),
    result_description TEXT,
    
    -- Linked transaction
    transaction_id UUID REFERENCES wallet_transactions(id),
    
    -- Agent link (if paying agent)
    agent_id UUID REFERENCES agents(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_active ON wallets(is_active);

CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_created ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference);
CREATE INDEX idx_wallet_transactions_external_ref ON wallet_transactions(external_reference);

CREATE INDEX idx_mpesa_stk_wallet ON mpesa_stk_requests(wallet_id);
CREATE INDEX idx_mpesa_stk_checkout ON mpesa_stk_requests(checkout_request_id);
CREATE INDEX idx_mpesa_stk_status ON mpesa_stk_requests(status);

CREATE INDEX idx_mpesa_disbursements_wallet ON mpesa_disbursements(sender_wallet_id);
CREATE INDEX idx_mpesa_disbursements_conversation ON mpesa_disbursements(conversation_id);
CREATE INDEX idx_mpesa_disbursements_status ON mpesa_disbursements(status);

-- Auto-create wallet on user registration
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_create_user_wallet
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_wallet();

-- Function to credit wallet
CREATE OR REPLACE FUNCTION credit_wallet(
    p_wallet_id UUID,
    p_amount DECIMAL(12, 2),
    p_type transaction_type,
    p_description TEXT,
    p_reference VARCHAR(100) DEFAULT NULL,
    p_external_reference VARCHAR(100) DEFAULT NULL,
    p_mpesa_receipt VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_balance_before DECIMAL(12, 2);
    v_balance_after DECIMAL(12, 2);
    v_transaction_id UUID;
BEGIN
    -- Get current balance
    SELECT balance INTO v_balance_before
    FROM wallets WHERE id = p_wallet_id FOR UPDATE;
    
    v_balance_after := v_balance_before + p_amount;
    
    -- Create transaction
    INSERT INTO wallet_transactions (
        wallet_id, type, amount, balance_before, balance_after,
        description, reference, external_reference, mpesa_receipt_number,
        status, completed_at
    ) VALUES (
        p_wallet_id, p_type, p_amount, v_balance_before, v_balance_after,
        p_description, p_reference, p_external_reference, p_mpesa_receipt,
        'completed', NOW()
    ) RETURNING id INTO v_transaction_id;
    
    -- Update wallet balance
    UPDATE wallets
    SET balance = v_balance_after,
        total_credited = total_credited + p_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to debit wallet
CREATE OR REPLACE FUNCTION debit_wallet(
    p_wallet_id UUID,
    p_amount DECIMAL(12, 2),
    p_type transaction_type,
    p_description TEXT,
    p_reference VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_balance_before DECIMAL(12, 2);
    v_balance_after DECIMAL(12, 2);
    v_transaction_id UUID;
BEGIN
    -- Get current balance
    SELECT balance INTO v_balance_before
    FROM wallets WHERE id = p_wallet_id FOR UPDATE;
    
    -- Check sufficient balance
    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    
    v_balance_after := v_balance_before - p_amount;
    
    -- Create transaction
    INSERT INTO wallet_transactions (
        wallet_id, type, amount, balance_before, balance_after,
        description, reference, status, completed_at
    ) VALUES (
        p_wallet_id, p_type, -p_amount, v_balance_before, v_balance_after,
        p_description, p_reference, 'completed', NOW()
    ) RETURNING id INTO v_transaction_id;
    
    -- Update wallet balance
    UPDATE wallets
    SET balance = v_balance_after,
        total_debited = total_debited + p_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE wallets IS 'User wallets for payments and credits';
COMMENT ON TABLE wallet_transactions IS 'All wallet credit/debit transactions';
COMMENT ON TABLE mpesa_stk_requests IS 'M-Pesa STK Push requests for wallet top-up';
COMMENT ON TABLE mpesa_disbursements IS 'M-Pesa B2C disbursements to recipients';
