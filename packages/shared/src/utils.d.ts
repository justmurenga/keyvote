/**
 * Utility functions shared across applications
 */
/**
 * Format a number with thousands separators
 */
export declare function formatNumber(num: number): string;
/**
 * Format a date for display
 */
export declare function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string;
/**
 * Format currency (KES)
 */
export declare function formatCurrency(amount: number): string;
/**
 * Get initials from a name
 */
export declare function getInitials(name: string): string;
/**
 * Truncate text with ellipsis
 */
export declare function truncate(str: string, length: number): string;
/**
 * Generate URL-friendly slug
 */
export declare function generateSlug(str: string): string;
/**
 * Calculate percentage
 */
export declare function calculatePercentage(value: number, total: number, decimals?: number): number;
/**
 * Normalize Kenyan phone number to +254 format
 */
export declare function normalizePhone(phone: string): string;
/**
 * Validate Kenyan ID number format
 */
export declare function validateIdNumber(idNumber: string): boolean;
/**
 * Validate Kenyan phone number
 */
export declare function validatePhone(phone: string): boolean;
/**
 * Get relative time string (e.g., "2 hours ago")
 */
export declare function getRelativeTime(date: Date | string): string;
/**
 * Parse stream from polling station code/name
 * Streams are typically A, B, C... or 1, 2, 3...
 */
export declare function parseStream(stationCode: string, stationName: string): string | null;
/**
 * Build electoral hierarchy path
 * e.g., "Nairobi → Westlands → Kangemi"
 */
export declare function buildElectoralPath(county: string, constituency?: string, ward?: string): string;
/**
 * Calculate MODE (Most Common Value) from an array of numbers
 * Used for election result verification
 */
export declare function calculateMode(values: number[]): number | null;
/**
 * Delay execution (for rate limiting, etc.)
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Chunk array into smaller arrays
 */
export declare function chunkArray<T>(array: T[], size: number): T[][];
/**
 * Safe JSON parse
 */
export declare function safeJsonParse<T>(json: string, fallback: T): T;
/**
 * Generate random alphanumeric string
 */
export declare function generateId(length?: number): string;
/**
 * Mask phone number for privacy
 * e.g., +254712345678 → +254712***678
 */
export declare function maskPhone(phone: string): string;
/**
 * Mask ID number for privacy
 * e.g., 12345678 → 1234****
 */
export declare function maskIdNumber(idNumber: string): string;
//# sourceMappingURL=utils.d.ts.map