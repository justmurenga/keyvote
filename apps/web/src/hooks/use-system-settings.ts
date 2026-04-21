'use client';

import { useEffect, useState } from 'react';

export interface SystemSettings {
  siteName?: string;
  supportPhone?: string;
  whatsappPhone?: string;
  ussdCode?: string;
  supportEmail?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  maintenanceMode?: boolean;
  registrationOpen?: boolean;
}

const defaultSettings: SystemSettings = {
  siteName: 'myVote Kenya',
  supportPhone: '+254 733 638 940',
  whatsappPhone: '+254 733 638 940',
  ussdCode: '*384*VOTE#',
  supportEmail: 'support@keyvote.online',
  facebookUrl: 'https://facebook.com/myvotekenya',
  instagramUrl: 'https://instagram.com/myvotekenya',
  tiktokUrl: 'https://tiktok.com/@myvotekenya',
};

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings({ ...defaultSettings, ...data });
      })
      .catch(() => {
        // Use defaults on error
      })
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}
