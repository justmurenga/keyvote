-- ============================================
-- System Settings (key-value store)
-- ============================================
-- Stores platform-wide configuration that admins
-- can update from the System Settings page.

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- Seed default values
INSERT INTO system_settings (key, value) VALUES
  ('general', '{
    "siteName": "myVote Kenya",
    "supportPhone": "+254 700 000 000",
    "ussdCode": "*123#",
    "supportEmail": "support@myvote.co.ke",
    "maintenanceMode": false,
    "registrationOpen": true,
    "maxPollsPerUser": "5",
    "defaultPollDuration": "7"
  }'::jsonb),
  ('security', '{
    "otpExpiry": "300",
    "maxLoginAttempts": "5",
    "sessionTimeout": "86400",
    "requirePhoneVerification": true,
    "requireIdVerification": false,
    "allowMultipleDevices": true,
    "enableRateLimiting": true,
    "rateLimitWindow": "60",
    "rateLimitMax": "100"
  }'::jsonb),
  ('notifications', '{
    "smsEnabled": true,
    "smsProvider": "africas_talking",
    "whatsappEnabled": false,
    "pushEnabled": true,
    "emailEnabled": false,
    "pollReminders": true,
    "resultNotifications": true,
    "systemAlerts": true
  }'::jsonb),
  ('payments', '{
    "mpesaEnabled": true,
    "mpesaEnv": "sandbox",
    "minTopup": "10",
    "maxTopup": "150000",
    "minWithdrawal": "50",
    "maxWithdrawal": "70000",
    "transactionFee": "0",
    "walletEnabled": true
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Allow public read access to general settings (for sidebar contact info)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read general settings"
  ON system_settings FOR SELECT
  USING (key = 'general');

CREATE POLICY "Admins can read all settings"
  ON system_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'system_admin'
    )
  );

CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'system_admin'
    )
  );
