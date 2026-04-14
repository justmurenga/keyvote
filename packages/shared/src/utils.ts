/**
 * Utility functions shared across applications
 */

/**
 * Format a number with thousands separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-KE').format(num);
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  };
  return new Intl.DateTimeFormat('en-KE', options || defaultOptions).format(new Date(date));
}

/**
 * Format currency (KES)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Generate URL-friendly slug
 */
export function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number, decimals = 1): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Normalize Kenyan phone number to +254 format
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('254')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+254${cleaned.slice(1)}`;
  }
  if (cleaned.length === 9) {
    return `+254${cleaned}`;
  }
  
  return phone;
}

/**
 * Validate Kenyan ID number format
 */
export function validateIdNumber(idNumber: string): boolean {
  const cleaned = idNumber.replace(/\s/g, '');
  return /^\d{7,10}$/.test(cleaned);
}

/**
 * Validate Kenyan phone number
 */
export function validatePhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+254[17]\d{8}$/.test(normalized);
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/**
 * Parse stream from polling station code/name
 * Streams are typically A, B, C... or 1, 2, 3...
 */
export function parseStream(stationCode: string, stationName: string): string | null {
  // Check for stream in code (e.g., "PS001A" -> "A")
  const codeMatch = stationCode.match(/([A-Z])$/);
  if (codeMatch) {
    return codeMatch[1];
  }
  
  // Check for "STREAM" in name (e.g., "STATION NAME STREAM A")
  const nameMatch = stationName.match(/STREAM\s*([A-Z0-9])/i);
  if (nameMatch) {
    return nameMatch[1].toUpperCase();
  }
  
  return null;
}

/**
 * Build electoral hierarchy path
 * e.g., "Nairobi → Westlands → Kangemi"
 */
export function buildElectoralPath(
  county: string,
  constituency?: string,
  ward?: string
): string {
  const parts = [county];
  if (constituency) parts.push(constituency);
  if (ward) parts.push(ward);
  return parts.join(' → ');
}

/**
 * Calculate MODE (Most Common Value) from an array of numbers
 * Used for election result verification
 */
export function calculateMode(values: number[]): number | null {
  if (values.length === 0) return null;
  
  const counts = new Map<number, number>();
  let maxCount = 0;
  let mode = values[0];
  
  for (const value of values) {
    const count = (counts.get(value) || 0) + 1;
    counts.set(value, count);
    
    if (count > maxCount) {
      maxCount = count;
      mode = value;
    }
  }
  
  return mode;
}

/**
 * Delay execution (for rate limiting, etc.)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Generate random alphanumeric string
 */
export function generateId(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Mask phone number for privacy
 * e.g., +254712345678 → +254712***678
 */
export function maskPhone(phone: string): string {
  if (phone.length < 10) return phone;
  const start = phone.slice(0, -6);
  const end = phone.slice(-3);
  return `${start}***${end}`;
}

/**
 * Mask ID number for privacy
 * e.g., 12345678 → 1234****
 */
export function maskIdNumber(idNumber: string): string {
  if (idNumber.length < 4) return '****';
  return idNumber.slice(0, 4) + '*'.repeat(idNumber.length - 4);
}
