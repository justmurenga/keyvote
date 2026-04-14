"use strict";
/**
 * Utility functions shared across applications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskIdNumber = exports.maskPhone = exports.generateId = exports.safeJsonParse = exports.chunkArray = exports.delay = exports.calculateMode = exports.buildElectoralPath = exports.parseStream = exports.getRelativeTime = exports.validatePhone = exports.validateIdNumber = exports.normalizePhone = exports.calculatePercentage = exports.generateSlug = exports.truncate = exports.getInitials = exports.formatCurrency = exports.formatDate = exports.formatNumber = void 0;
/**
 * Format a number with thousands separators
 */
function formatNumber(num) {
    return new Intl.NumberFormat('en-KE').format(num);
}
exports.formatNumber = formatNumber;
/**
 * Format a date for display
 */
function formatDate(date, options) {
    const defaultOptions = {
        dateStyle: 'medium',
        timeStyle: 'short',
    };
    return new Intl.DateTimeFormat('en-KE', options || defaultOptions).format(new Date(date));
}
exports.formatDate = formatDate;
/**
 * Format currency (KES)
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
exports.formatCurrency = formatCurrency;
/**
 * Get initials from a name
 */
function getInitials(name) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
exports.getInitials = getInitials;
/**
 * Truncate text with ellipsis
 */
function truncate(str, length) {
    if (str.length <= length)
        return str;
    return str.slice(0, length) + '...';
}
exports.truncate = truncate;
/**
 * Generate URL-friendly slug
 */
function generateSlug(str) {
    return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}
exports.generateSlug = generateSlug;
/**
 * Calculate percentage
 */
function calculatePercentage(value, total, decimals = 1) {
    if (total === 0)
        return 0;
    return Math.round((value / total) * 100 * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
exports.calculatePercentage = calculatePercentage;
/**
 * Normalize Kenyan phone number to +254 format
 */
function normalizePhone(phone) {
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
exports.normalizePhone = normalizePhone;
/**
 * Validate Kenyan ID number format
 */
function validateIdNumber(idNumber) {
    const cleaned = idNumber.replace(/\s/g, '');
    return /^\d{7,10}$/.test(cleaned);
}
exports.validateIdNumber = validateIdNumber;
/**
 * Validate Kenyan phone number
 */
function validatePhone(phone) {
    const normalized = normalizePhone(phone);
    return /^\+254[17]\d{8}$/.test(normalized);
}
exports.validatePhone = validatePhone;
/**
 * Get relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date) {
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
    if (seconds < 60)
        return 'Just now';
    if (minutes < 60)
        return `${minutes}m ago`;
    if (hours < 24)
        return `${hours}h ago`;
    if (days < 7)
        return `${days}d ago`;
    if (weeks < 4)
        return `${weeks}w ago`;
    if (months < 12)
        return `${months}mo ago`;
    return `${years}y ago`;
}
exports.getRelativeTime = getRelativeTime;
/**
 * Parse stream from polling station code/name
 * Streams are typically A, B, C... or 1, 2, 3...
 */
function parseStream(stationCode, stationName) {
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
exports.parseStream = parseStream;
/**
 * Build electoral hierarchy path
 * e.g., "Nairobi → Westlands → Kangemi"
 */
function buildElectoralPath(county, constituency, ward) {
    const parts = [county];
    if (constituency)
        parts.push(constituency);
    if (ward)
        parts.push(ward);
    return parts.join(' → ');
}
exports.buildElectoralPath = buildElectoralPath;
/**
 * Calculate MODE (Most Common Value) from an array of numbers
 * Used for election result verification
 */
function calculateMode(values) {
    if (values.length === 0)
        return null;
    const counts = new Map();
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
exports.calculateMode = calculateMode;
/**
 * Delay execution (for rate limiting, etc.)
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.delay = delay;
/**
 * Chunk array into smaller arrays
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
exports.chunkArray = chunkArray;
/**
 * Safe JSON parse
 */
function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
exports.safeJsonParse = safeJsonParse;
/**
 * Generate random alphanumeric string
 */
function generateId(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
exports.generateId = generateId;
/**
 * Mask phone number for privacy
 * e.g., +254712345678 → +254712***678
 */
function maskPhone(phone) {
    if (phone.length < 10)
        return phone;
    const start = phone.slice(0, -6);
    const end = phone.slice(-3);
    return `${start}***${end}`;
}
exports.maskPhone = maskPhone;
/**
 * Mask ID number for privacy
 * e.g., 12345678 → 1234****
 */
function maskIdNumber(idNumber) {
    if (idNumber.length < 4)
        return '****';
    return idNumber.slice(0, 4) + '*'.repeat(idNumber.length - 4);
}
exports.maskIdNumber = maskIdNumber;
//# sourceMappingURL=utils.js.map