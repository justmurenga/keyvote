/**
 * M-Pesa Daraja API Integration
 * 
 * This module handles M-Pesa STK Push (Lipa Na M-Pesa Online) integration
 * for wallet top-ups using Safaricom's Daraja API.
 * 
 * Environment Variables Required (stored in vault):
 * - MPESA_CONSUMER_KEY
 * - MPESA_CONSUMER_SECRET
 * - MPESA_PASSKEY
 * - MPESA_SHORTCODE (Paybill or Till Number)
 * - MPESA_CALLBACK_URL
 * - MPESA_ENVIRONMENT ('sandbox' | 'production')
 */

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface STKQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}

// Parsed callback data
export interface MpesaCallbackData {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

/**
 * Get M-Pesa configuration from environment variables
 */
export function getMpesaConfig(): MpesaConfig {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const passkey = process.env.MPESA_PASSKEY;
  const shortcode = process.env.MPESA_SHORTCODE;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  const environment = (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

  if (!consumerKey || !consumerSecret || !passkey || !shortcode || !callbackUrl) {
    throw new Error('Missing required M-Pesa environment variables');
  }

  return {
    consumerKey,
    consumerSecret,
    passkey,
    shortcode,
    callbackUrl,
    environment,
  };
}

/**
 * Get the base URL for M-Pesa API based on environment
 */
function getBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

/**
 * Get OAuth access token from M-Pesa
 */
export async function getAccessToken(config: MpesaConfig): Promise<string> {
  const baseUrl = getBaseUrl(config.environment);
  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get M-Pesa access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Generate the password for STK Push
 * Password = Base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

/**
 * Format phone number to 254XXXXXXXXX format required by M-Pesa
 */
export function formatPhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or special characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Convert 0XXXXXXXXX to 254XXXXXXXXX
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // Validate the result
  if (!/^254[17]\d{8}$/.test(cleaned)) {
    throw new Error('Invalid phone number format. Must be a valid Kenyan phone number.');
  }
  
  return cleaned;
}

/**
 * Get current timestamp in the format YYYYMMDDHHMMSS
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
}

/**
 * Initiate STK Push (Lipa Na M-Pesa Online)
 */
export async function initiateSTKPush(
  config: MpesaConfig,
  request: STKPushRequest
): Promise<STKPushResponse> {
  const baseUrl = getBaseUrl(config.environment);
  const accessToken = await getAccessToken(config);
  const timestamp = getTimestamp();
  const password = generatePassword(config.shortcode, config.passkey, timestamp);
  const formattedPhone = formatPhoneNumber(request.phoneNumber);

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(request.amount), // M-Pesa requires whole numbers
    PartyA: formattedPhone,
    PartyB: config.shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: config.callbackUrl,
    AccountReference: request.accountReference.substring(0, 12), // Max 12 chars
    TransactionDesc: request.transactionDesc.substring(0, 13), // Max 13 chars
  };

  console.log('[M-Pesa] Initiating STK Push:', {
    phoneNumber: formattedPhone,
    amount: request.amount,
    accountReference: payload.AccountReference,
  });

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.ResponseCode !== '0') {
    console.error('[M-Pesa] STK Push failed:', data);
    throw new Error(data.errorMessage || data.ResponseDescription || 'STK Push request failed');
  }

  console.log('[M-Pesa] STK Push initiated successfully:', data);
  return data as STKPushResponse;
}

/**
 * Query STK Push transaction status
 */
export async function querySTKPushStatus(
  config: MpesaConfig,
  checkoutRequestId: string
): Promise<STKQueryResponse> {
  const baseUrl = getBaseUrl(config.environment);
  const accessToken = await getAccessToken(config);
  const timestamp = getTimestamp();
  const password = generatePassword(config.shortcode, config.passkey, timestamp);

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[M-Pesa] STK Query failed:', data);
    throw new Error(data.errorMessage || 'STK Query request failed');
  }

  return data as STKQueryResponse;
}

/**
 * Parse M-Pesa callback body to extract transaction details
 */
export function parseCallback(body: MpesaCallbackBody): MpesaCallbackData {
  const callback = body.Body.stkCallback;
  
  const data: MpesaCallbackData = {
    merchantRequestId: callback.MerchantRequestID,
    checkoutRequestId: callback.CheckoutRequestID,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
  };

  // Extract metadata if transaction was successful
  if (callback.ResultCode === 0 && callback.CallbackMetadata?.Item) {
    for (const item of callback.CallbackMetadata.Item) {
      switch (item.Name) {
        case 'Amount':
          data.amount = item.Value as number;
          break;
        case 'MpesaReceiptNumber':
          data.mpesaReceiptNumber = item.Value as string;
          break;
        case 'TransactionDate':
          data.transactionDate = String(item.Value);
          break;
        case 'PhoneNumber':
          data.phoneNumber = String(item.Value);
          break;
      }
    }
  }

  return data;
}

/**
 * Check if the callback indicates a successful transaction
 */
export function isTransactionSuccessful(data: MpesaCallbackData): boolean {
  return data.resultCode === 0;
}

/**
 * Get human-readable error message from result code
 */
export function getResultCodeMessage(resultCode: number): string {
  const messages: Record<number, string> = {
    0: 'Transaction successful',
    1: 'Insufficient balance',
    1032: 'Transaction cancelled by user',
    1037: 'Timeout waiting for user response',
    2001: 'Wrong PIN entered',
    1001: 'Unable to lock subscriber',
    1019: 'Transaction expired',
    1025: 'An error occurred on the transaction',
  };
  
  return messages[resultCode] || `Transaction failed with code ${resultCode}`;
}
