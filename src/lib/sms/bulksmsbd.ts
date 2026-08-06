import { env } from '@/lib/env';

export type BulkSmsBdResponse = {
  success: boolean;
  provider: 'BulkSMSBD';
  response: unknown;
  error?: string;
};

type BulkSmsBdConfig = {
  apiKey: string;
  senderId: string;
  apiUrl: string;
};

const PROVIDER_NAME = 'BulkSMSBD' as const;

function isDevelopment() {
  return env.NODE_ENV === 'development';
}

function maskPhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length <= 4) {
    return '****';
  }

  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function sanitizeErrorMessage(message: string, apiKey?: string) {
  if (!apiKey) {
    return message;
  }

  return message.split(apiKey).join('[REDACTED_API_KEY]');
}

function sanitizeProviderResponse(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeProviderResponse);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (key.toLowerCase().includes('api_key') || key.toLowerCase().includes('apikey')) {
          return [key, '[REDACTED]'];
        }

        return [key, sanitizeProviderResponse(item)];
      })
    );
  }

  return value;
}

function getMaskedRequestUrl(url: URL) {
  const maskedUrl = new URL(url.toString());
  if (maskedUrl.searchParams.has('api_key')) {
    maskedUrl.searchParams.set('api_key', '[REDACTED_API_KEY]');
  }
  return maskedUrl.toString();
}

export function normalizeSmsPhoneNumber(phoneNumber: string) {
  const raw = phoneNumber.trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  if (raw.startsWith('+') && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }

  if (digits.length === 13 && digits.startsWith('8801')) {
    return digits;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  return null;
}

function getBulkSmsBdConfig(): BulkSmsBdConfig {
  const apiKey = env.BULKSMSBD_API_KEY?.trim();
  const senderId = env.BULKSMSBD_SENDER_ID?.trim();
  const apiUrl = env.BULKSMSBD_API_URL?.trim();

  const missing = [
    !apiKey ? 'BULKSMSBD_API_KEY' : null,
    !senderId ? 'BULKSMSBD_SENDER_ID' : null,
    !apiUrl ? 'BULKSMSBD_API_URL' : null
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing BulkSMSBD configuration: ${missing.join(', ')}`);
  }

  if (!apiKey || !senderId || !apiUrl) {
    throw new Error('BulkSMSBD configuration is incomplete.');
  }

  try {
    new URL(apiUrl);
  } catch {
    throw new Error('BULKSMSBD_API_URL must be a valid URL.');
  }

  return { apiKey, senderId, apiUrl };
}

function parseProviderBody(text: string) {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getProviderError(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== 'object') {
    return null;
  }

  const body = responseBody as Record<string, unknown>;
  const error = body.error ?? body.error_message ?? body.errorMessage ?? body.message ?? body.response_message;

  return typeof error === 'string' && error.trim() ? error : null;
}

function isSuccessfulProviderResponse(responseOk: boolean, responseBody: unknown) {
  if (!responseOk) {
    return false;
  }

  if (responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody)) {
    const body = responseBody as Record<string, unknown>;
    const responseCode = body.response_code ?? body.responseCode ?? body.code;

    if (responseCode !== undefined && responseCode !== null) {
      const code = Number(responseCode);
      if (Number.isFinite(code)) {
        return code >= 200 && code < 300;
      }
    }

    const status = String(body.status ?? body.success ?? '').toLowerCase();
    if (['true', 'success', 'sent', 'submitted', 'ok'].includes(status)) {
      return true;
    }

    if (body.error || body.error_message || body.errorMessage) {
      return false;
    }
  }

  if (responseBody && typeof responseBody === 'object' && 'raw' in responseBody) {
    const raw = String((responseBody as { raw: unknown }).raw).toLowerCase();
    if (raw.includes('error') || raw.includes('invalid') || raw.includes('failed')) {
      return false;
    }

    return raw.includes('submitted') || raw.includes('success') || raw.includes('sent');
  }

  return true;
}

export async function sendSMS(phoneNumber: string, message: string): Promise<BulkSmsBdResponse> {
  let config: BulkSmsBdConfig;

  try {
    config = getBulkSmsBdConfig();
  } catch (error) {
    return {
      success: false,
      provider: PROVIDER_NAME,
      response: null,
      error: error instanceof Error ? error.message : 'BulkSMSBD configuration is invalid.'
    };
  }

  const normalizedPhoneNumber = normalizeSmsPhoneNumber(phoneNumber);
  const trimmedMessage = message.trim();

  if (!normalizedPhoneNumber) {
    return {
      success: false,
      provider: PROVIDER_NAME,
      response: null,
      error: 'Invalid phone number.'
    };
  }

  if (!trimmedMessage) {
    return {
      success: false,
      provider: PROVIDER_NAME,
      response: null,
      error: 'SMS message is required.'
    };
  }

  const requestUrl = new URL(config.apiUrl);
  requestUrl.searchParams.set('api_key', config.apiKey);
  requestUrl.searchParams.set('type', 'text');
  requestUrl.searchParams.set('number', normalizedPhoneNumber);
  requestUrl.searchParams.set('senderid', config.senderId);
  requestUrl.searchParams.set('message', trimmedMessage);

  const observedRequestParams = {
    api_key: '[REDACTED_API_KEY]',
    type: 'text',
    number: normalizedPhoneNumber,
    senderid: config.senderId,
    message: trimmedMessage
  };

  console.info('[BulkSMSBD] sending SMS', {
    phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
    provider: PROVIDER_NAME,
    requestUrl: getMaskedRequestUrl(requestUrl),
    requestParams: observedRequestParams,
    messageLength: trimmedMessage.length,
    apiUrlBase: config.apiUrl
  });

  try {
    const response = await fetch(requestUrl.toString(), { method: 'GET' });
    const text = await response.text();
    const parsedBody = sanitizeProviderResponse(parseProviderBody(text));
    const success = isSuccessfulProviderResponse(response.ok, parsedBody);

    if (isDevelopment()) {
      console.info('[BulkSMSBD] SMS response', {
        success,
        status: response.status,
        phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
        response: parsedBody
      });
    }

    if (!success) {
      return {
        success: false,
        provider: PROVIDER_NAME,
        response: parsedBody,
        error: getProviderError(parsedBody) ?? `BulkSMSBD API returned HTTP ${response.status}.`
      };
    }

    return {
      success: true,
      provider: PROVIDER_NAME,
      response: parsedBody
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? sanitizeErrorMessage(error.message, config.apiKey)
      : 'Network error while sending SMS.';

    if (isDevelopment()) {
      console.error('[BulkSMSBD] SMS network error', {
        phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
        error: errorMessage
      });
    }

    return {
      success: false,
      provider: PROVIDER_NAME,
      response: null,
      error: errorMessage
    };
  }
}
