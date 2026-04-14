"use strict";
/**
 * Application-wide constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.RATE_LIMITS = exports.ALLOWED_DOCUMENT_TYPES = exports.ALLOWED_IMAGE_TYPES = exports.MAX_FILE_SIZE = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.USSD_CODES = exports.KENYA_COUNTIES = exports.SUBSCRIPTION_FEATURES = exports.SUBSCRIPTION_TYPES = exports.PAYMENT_METHODS = exports.TRANSACTION_TYPES = exports.CHANNEL_LABELS = exports.MESSAGE_CHANNELS = exports.GENDER_LABELS = exports.GENDERS = exports.AGE_BRACKETS = exports.ROLE_LABELS = exports.USER_ROLES = exports.POSITION_HIERARCHY = exports.POSITION_LABELS = exports.ELECTORAL_POSITIONS = void 0;
// Kenya Electoral System
exports.ELECTORAL_POSITIONS = [
    'president',
    'governor',
    'senator',
    'women_rep',
    'mp',
    'mca',
];
exports.POSITION_LABELS = {
    president: 'President',
    governor: 'Governor',
    senator: 'Senator',
    women_rep: "Women's Representative",
    mp: 'Member of Parliament',
    mca: 'Member of County Assembly',
};
exports.POSITION_HIERARCHY = {
    president: 'National',
    governor: 'County',
    senator: 'County',
    women_rep: 'County',
    mp: 'Constituency',
    mca: 'Ward',
};
// User Roles
exports.USER_ROLES = ['voter', 'candidate', 'agent', 'admin', 'super_admin'];
exports.ROLE_LABELS = {
    voter: 'Voter',
    candidate: 'Candidate',
    agent: 'Agent',
    admin: 'Administrator',
    super_admin: 'Super Administrator',
};
// Age Brackets
exports.AGE_BRACKETS = ['18-25', '26-35', '36-45', '46-60', '60+'];
// Gender
exports.GENDERS = ['male', 'female', 'other'];
exports.GENDER_LABELS = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
};
// Message Channels
exports.MESSAGE_CHANNELS = ['sms', 'whatsapp', 'push', 'email'];
exports.CHANNEL_LABELS = {
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    push: 'Push Notification',
    email: 'Email',
};
// Transaction Types
exports.TRANSACTION_TYPES = ['credit', 'debit', 'transfer'];
// Payment Methods
exports.PAYMENT_METHODS = ['mpesa', 'bank', 'card', 'wallet'];
// Subscription Types
exports.SUBSCRIPTION_TYPES = ['free', 'basic', 'premium', 'enterprise'];
exports.SUBSCRIPTION_FEATURES = {
    free: [
        'Follow up to 5 candidates',
        'View public polls',
        'Basic notifications',
    ],
    basic: [
        'Follow up to 20 candidates',
        'Participate in all polls',
        'SMS notifications',
        'Basic analytics',
    ],
    premium: [
        'Unlimited follows',
        'All poll features',
        'SMS + WhatsApp notifications',
        'Advanced analytics',
        'Priority support',
    ],
    enterprise: [
        'Everything in Premium',
        'API access',
        'Custom integrations',
        'Dedicated support',
        'White-label options',
    ],
};
// Kenya Counties (47)
exports.KENYA_COUNTIES = [
    { code: '001', name: 'MOMBASA' },
    { code: '002', name: 'KWALE' },
    { code: '003', name: 'KILIFI' },
    { code: '004', name: 'TANA RIVER' },
    { code: '005', name: 'LAMU' },
    { code: '006', name: 'TAITA TAVETA' },
    { code: '007', name: 'GARISSA' },
    { code: '008', name: 'WAJIR' },
    { code: '009', name: 'MANDERA' },
    { code: '010', name: 'MARSABIT' },
    { code: '011', name: 'ISIOLO' },
    { code: '012', name: 'MERU' },
    { code: '013', name: 'THARAKA NITHI' },
    { code: '014', name: 'EMBU' },
    { code: '015', name: 'KITUI' },
    { code: '016', name: 'MACHAKOS' },
    { code: '017', name: 'MAKUENI' },
    { code: '018', name: 'NYANDARUA' },
    { code: '019', name: 'NYERI' },
    { code: '020', name: 'KIRINYAGA' },
    { code: '021', name: "MURANG'A" },
    { code: '022', name: 'KIAMBU' },
    { code: '023', name: 'TURKANA' },
    { code: '024', name: 'WEST POKOT' },
    { code: '025', name: 'SAMBURU' },
    { code: '026', name: 'TRANS NZOIA' },
    { code: '027', name: 'UASIN GISHU' },
    { code: '028', name: 'ELGEYO MARAKWET' },
    { code: '029', name: 'NANDI' },
    { code: '030', name: 'BARINGO' },
    { code: '031', name: 'LAIKIPIA' },
    { code: '032', name: 'NAKURU' },
    { code: '033', name: 'NAROK' },
    { code: '034', name: 'KAJIADO' },
    { code: '035', name: 'KERICHO' },
    { code: '036', name: 'BOMET' },
    { code: '037', name: 'KAKAMEGA' },
    { code: '038', name: 'VIHIGA' },
    { code: '039', name: 'BUNGOMA' },
    { code: '040', name: 'BUSIA' },
    { code: '041', name: 'SIAYA' },
    { code: '042', name: 'KISUMU' },
    { code: '043', name: 'HOMA BAY' },
    { code: '044', name: 'MIGORI' },
    { code: '045', name: 'KISII' },
    { code: '046', name: 'NYAMIRA' },
    { code: '047', name: 'NAIROBI' },
];
// USSD Menu Codes
exports.USSD_CODES = {
    MAIN_MENU: '*123#',
    CHECK_POLLING_STATION: '1',
    FOLLOW_CANDIDATE: '2',
    VIEW_POLLS: '3',
    ELECTION_RESULTS: '4',
    WALLET: '5',
    MY_PROFILE: '6',
    HELP: '0',
};
// Pagination
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
// File Upload
exports.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
exports.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
exports.ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
// API Rate Limits (per minute)
exports.RATE_LIMITS = {
    PUBLIC: 60,
    AUTHENTICATED: 120,
    ADMIN: 300,
};
// Cache TTLs (in seconds)
exports.CACHE_TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
};
//# sourceMappingURL=constants.js.map