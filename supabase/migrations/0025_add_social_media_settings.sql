-- Add social media and enhanced contact info to general settings
UPDATE system_settings
SET value = value || '{
  "supportPhone": "+254 733 638 940",
  "whatsappPhone": "+254 733 638 940",
  "ussdCode": "*384*VOTE#",
  "supportEmail": "support@myvote.ke",
  "facebookUrl": "https://facebook.com/myvotekenya",
  "instagramUrl": "https://instagram.com/myvotekenya",
  "tiktokUrl": "https://tiktok.com/@myvotekenya"
}'::jsonb
WHERE key = 'general';
