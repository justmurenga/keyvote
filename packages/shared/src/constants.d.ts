/**
 * Application-wide constants
 */
export declare const ELECTORAL_POSITIONS: readonly ["president", "governor", "senator", "women_rep", "mp", "mca"];
export type ElectoralPosition = (typeof ELECTORAL_POSITIONS)[number];
export declare const POSITION_LABELS: Record<ElectoralPosition, string>;
export declare const POSITION_HIERARCHY: Record<ElectoralPosition, string>;
export declare const USER_ROLES: readonly ["voter", "candidate", "agent", "admin", "super_admin"];
export type UserRole = (typeof USER_ROLES)[number];
export declare const ROLE_LABELS: Record<UserRole, string>;
export declare const AGE_BRACKETS: readonly ["18-25", "26-35", "36-45", "46-60", "60+"];
export type AgeBracket = (typeof AGE_BRACKETS)[number];
export declare const GENDERS: readonly ["male", "female", "other"];
export type Gender = (typeof GENDERS)[number];
export declare const GENDER_LABELS: Record<Gender, string>;
export declare const MESSAGE_CHANNELS: readonly ["sms", "whatsapp", "push", "email"];
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];
export declare const CHANNEL_LABELS: Record<MessageChannel, string>;
export declare const TRANSACTION_TYPES: readonly ["credit", "debit", "transfer"];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export declare const PAYMENT_METHODS: readonly ["mpesa", "bank", "card", "wallet"];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export declare const SUBSCRIPTION_TYPES: readonly ["free", "basic", "premium", "enterprise"];
export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[number];
export declare const SUBSCRIPTION_FEATURES: Record<SubscriptionType, string[]>;
export declare const KENYA_COUNTIES: readonly [{
    readonly code: "001";
    readonly name: "MOMBASA";
}, {
    readonly code: "002";
    readonly name: "KWALE";
}, {
    readonly code: "003";
    readonly name: "KILIFI";
}, {
    readonly code: "004";
    readonly name: "TANA RIVER";
}, {
    readonly code: "005";
    readonly name: "LAMU";
}, {
    readonly code: "006";
    readonly name: "TAITA TAVETA";
}, {
    readonly code: "007";
    readonly name: "GARISSA";
}, {
    readonly code: "008";
    readonly name: "WAJIR";
}, {
    readonly code: "009";
    readonly name: "MANDERA";
}, {
    readonly code: "010";
    readonly name: "MARSABIT";
}, {
    readonly code: "011";
    readonly name: "ISIOLO";
}, {
    readonly code: "012";
    readonly name: "MERU";
}, {
    readonly code: "013";
    readonly name: "THARAKA NITHI";
}, {
    readonly code: "014";
    readonly name: "EMBU";
}, {
    readonly code: "015";
    readonly name: "KITUI";
}, {
    readonly code: "016";
    readonly name: "MACHAKOS";
}, {
    readonly code: "017";
    readonly name: "MAKUENI";
}, {
    readonly code: "018";
    readonly name: "NYANDARUA";
}, {
    readonly code: "019";
    readonly name: "NYERI";
}, {
    readonly code: "020";
    readonly name: "KIRINYAGA";
}, {
    readonly code: "021";
    readonly name: "MURANG'A";
}, {
    readonly code: "022";
    readonly name: "KIAMBU";
}, {
    readonly code: "023";
    readonly name: "TURKANA";
}, {
    readonly code: "024";
    readonly name: "WEST POKOT";
}, {
    readonly code: "025";
    readonly name: "SAMBURU";
}, {
    readonly code: "026";
    readonly name: "TRANS NZOIA";
}, {
    readonly code: "027";
    readonly name: "UASIN GISHU";
}, {
    readonly code: "028";
    readonly name: "ELGEYO MARAKWET";
}, {
    readonly code: "029";
    readonly name: "NANDI";
}, {
    readonly code: "030";
    readonly name: "BARINGO";
}, {
    readonly code: "031";
    readonly name: "LAIKIPIA";
}, {
    readonly code: "032";
    readonly name: "NAKURU";
}, {
    readonly code: "033";
    readonly name: "NAROK";
}, {
    readonly code: "034";
    readonly name: "KAJIADO";
}, {
    readonly code: "035";
    readonly name: "KERICHO";
}, {
    readonly code: "036";
    readonly name: "BOMET";
}, {
    readonly code: "037";
    readonly name: "KAKAMEGA";
}, {
    readonly code: "038";
    readonly name: "VIHIGA";
}, {
    readonly code: "039";
    readonly name: "BUNGOMA";
}, {
    readonly code: "040";
    readonly name: "BUSIA";
}, {
    readonly code: "041";
    readonly name: "SIAYA";
}, {
    readonly code: "042";
    readonly name: "KISUMU";
}, {
    readonly code: "043";
    readonly name: "HOMA BAY";
}, {
    readonly code: "044";
    readonly name: "MIGORI";
}, {
    readonly code: "045";
    readonly name: "KISII";
}, {
    readonly code: "046";
    readonly name: "NYAMIRA";
}, {
    readonly code: "047";
    readonly name: "NAIROBI";
}];
export declare const USSD_CODES: {
    readonly MAIN_MENU: "*123#";
    readonly CHECK_POLLING_STATION: "1";
    readonly FOLLOW_CANDIDATE: "2";
    readonly VIEW_POLLS: "3";
    readonly ELECTION_RESULTS: "4";
    readonly WALLET: "5";
    readonly MY_PROFILE: "6";
    readonly HELP: "0";
};
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const MAX_FILE_SIZE: number;
export declare const ALLOWED_IMAGE_TYPES: string[];
export declare const ALLOWED_DOCUMENT_TYPES: string[];
export declare const RATE_LIMITS: {
    readonly PUBLIC: 60;
    readonly AUTHENTICATED: 120;
    readonly ADMIN: 300;
};
export declare const CACHE_TTL: {
    readonly SHORT: 60;
    readonly MEDIUM: 300;
    readonly LONG: 3600;
    readonly VERY_LONG: 86400;
};
//# sourceMappingURL=constants.d.ts.map