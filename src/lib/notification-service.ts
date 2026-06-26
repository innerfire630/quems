// =============================================================================
// src/lib/notification-service.ts — FCM Integration Architecture (4.1.1)
// =============================================================================
// Server-side wrapper around the Firebase Cloud Messaging HTTP v1 API.
// Provides a typed interface for sending push notifications to FCM device
// tokens, with a console-log fallback for local development when FCM
// credentials are not configured.
//
// Exports:
// - sendNotification(input): Promise<SendNotificationResult>
// - sendBatchNotifications(inputs): Promise<SendNotificationResult[]>
// - isFcmConfigured(): boolean
// - setOnInvalidTokenCallback(callback): void
//
// References:
// - Master Plan §3.3 (FCM technology choice), §14.1 (FCM integration overview)
// - https://firebase.google.com/docs/cloud-messaging/http-server-ref
// =============================================================================

import { randomUUID, createSign } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input shape for a single FCM notification dispatch. */
export interface SendNotificationInput {
  /** FCM device registration token (min 10 chars, enforced by caller). */
  token: string;
  /** Notification title (max 100 chars, enforced by caller). */
  title: string;
  /** Notification body text (max 200 chars, enforced by caller). */
  body: string;
  /** Structured data payload — all values must be strings (FCM requirement). */
  data?: Record<string, string>;
}

/** Result of a single FCM dispatch. Discriminated union — check `success`. */
export type SendNotificationResult =
  | { success: true; messageId: string; mode: 'fcm' | 'console' }
  | {
      success: false;
      error: 'INVALID_TOKEN' | 'CONFIGURATION_ERROR' | 'QUOTA_EXCEEDED' | 'TRANSIENT_ERROR';
      message: string;
    };

// ---------------------------------------------------------------------------
// Service account shape (subset of the full JSON key)
// ---------------------------------------------------------------------------

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

// ---------------------------------------------------------------------------
// Module-scope state
// ---------------------------------------------------------------------------

interface FcmConfig {
  configured: false;
}

interface FcmConfigured {
  configured: true;
  serviceAccount: ServiceAccount;
  projectId: string;
}

let fcmConfig: FcmConfig | FcmConfigured | null = null;
let hasLoggedConfigMessage = false;

let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let onInvalidTokenCallback: ((token: string) => void) | null = null;

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Reads env vars and parses the service account JSON. Cached after first call.
 */
function getFcmConfig(): FcmConfig | FcmConfigured {
  if (fcmConfig !== null) return fcmConfig;

  const json = process.env.FCM_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FCM_PROJECT_ID;

  if (!json || !projectId) {
    if (!hasLoggedConfigMessage) {
      console.info(
        '[FCM] Not configured — running in console-log mode. ' +
          'Set FCM_SERVICE_ACCOUNT_JSON and FCM_PROJECT_ID to enable real dispatch.',
      );
      hasLoggedConfigMessage = true;
    }
    fcmConfig = { configured: false };
    return fcmConfig;
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(json) as ServiceAccount;
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Missing required fields');
    }
  } catch {
    if (!hasLoggedConfigMessage) {
      console.warn(
        '[FCM] FCM_SERVICE_ACCOUNT_JSON is not valid JSON — falling back to console-log mode.',
      );
      hasLoggedConfigMessage = true;
    }
    fcmConfig = { configured: false };
    return fcmConfig;
  }

  fcmConfig = { configured: true, serviceAccount, projectId };
  return fcmConfig;
}

/**
 * Exchanges a service account JSON key for a short-lived OAuth 2.0 access token
 * via the Google OAuth 2.0 JWT bearer flow. Cached until 5 minutes before expiry.
 */
async function getAccessToken(config: FcmConfigured): Promise<string> {
  if (cachedAccessToken !== null && Date.now() < cachedAccessToken.expiresAt - 5 * 60 * 1000) {
    return cachedAccessToken.token;
  }

  const { serviceAccount } = config;

  // Build JWT claims
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Encode header & payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with RS256 using the service account private key
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  const signedJwt = `${signingInput}.${signature}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to obtain access token: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedAccessToken.token;
}

/**
 * Sends a message to the FCM HTTP v1 endpoint. Returns the raw Response.
 */
async function sendToFcm(
  input: SendNotificationInput,
  accessToken: string,
  projectId: string,
): Promise<Response> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const body = {
    message: {
      token: input.token,
      notification: {
        title: input.title,
        body: input.body,
      },
      data: input.data ?? {},
    },
  };

  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Maps an FCM error response to a typed failure result.
 */
function mapFcmErrorToResult(
  response: Response,
  errorBody: Record<string, unknown>,
): Extract<SendNotificationResult, { success: false }> {
  // Inspect error details for FCM-specific error codes
  const error = errorBody?.error as Record<string, unknown> | undefined;
  const details: Array<{ errorCode?: string }> =
    (error?.details as Array<{ errorCode?: string }>) ?? [];
  const errorCodes = details.map((d) => d.errorCode).filter(Boolean) as string[];

  // INVALID_TOKEN — token is no longer registered
  if (
    response.status === 404 ||
    errorCodes.includes('messaging/registration-token-not-registered') ||
    errorCodes.includes('messaging/invalid-registration-token')
  ) {
    return {
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Device token is no longer registered with FCM.',
    };
  }

  // CONFIGURATION_ERROR — SENDER_ID_MISMATCH, auth errors
  if (
    errorCodes.includes('messaging/mismatched-credential') ||
    errorCodes.includes('messaging/authentication-error') ||
    error?.status === 'UNAUTHENTICATED'
  ) {
    const detail = errorCodes.length > 0 ? errorCodes[0] : error?.status;
    console.error(`[FCM CRITICAL] Configuration error: ${detail}`);
    return {
      success: false,
      error: 'CONFIGURATION_ERROR',
      message: `FCM configuration error: ${detail}. Check service account and project ID.`,
    };
  }

  // QUOTA_EXCEEDED — rate limit hit
  if (errorCodes.includes('messaging/quota-exceeded') || error?.status === 'RESOURCE_EXHAUSTED') {
    console.warn('[FCM] Quota exceeded — rate limit hit.');
    return {
      success: false,
      error: 'QUOTA_EXCEEDED',
      message: 'FCM quota exceeded. Try again later.',
    };
  }

  // TRANSIENT_ERROR — 5xx, UNAVAILABLE, INTERNAL, DEADLINE_EXCEEDED
  if (
    response.status >= 500 ||
    error?.status === 'UNAVAILABLE' ||
    error?.status === 'INTERNAL' ||
    error?.status === 'DEADLINE_EXCEEDED'
  ) {
    return {
      success: false,
      error: 'TRANSIENT_ERROR',
      message: `Transient FCM error (HTTP ${response.status}).`,
    };
  }

  // Other 4xx → configuration error
  if (response.status >= 400 && response.status < 500) {
    return {
      success: false,
      error: 'CONFIGURATION_ERROR',
      message: `FCM returned HTTP ${response.status}: ${JSON.stringify(errorBody)}`,
    };
  }

  // Fallback
  return {
    success: false,
    error: 'TRANSIENT_ERROR',
    message: `Unexpected FCM response: HTTP ${response.status}`,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Returns true if both FCM env vars are present and the service account JSON
 * parses successfully.
 */
export function isFcmConfigured(): boolean {
  return getFcmConfig().configured;
}

/**
 * Dispatches a single push notification via FCM (or logs to console if FCM is
 * not configured). Never throws — always returns a typed result.
 */
export async function sendNotification(
  input: SendNotificationInput,
): Promise<SendNotificationResult> {
  const config = getFcmConfig();

  // Console-log fallback
  if (!config.configured) {
    const type = input.data?.type ?? 'unknown';
    const ticket = input.data?.ticketNumber ?? 'n/a';
    const service = input.data?.serviceName ?? 'n/a';
    const counter = input.data?.counterName ?? 'n/a';
    console.info(
      `[FCM console] type=${type} ticket=${ticket} service=${service} counter=${counter} mode=console`,
    );
    return { success: true, messageId: `console-${randomUUID()}`, mode: 'console' };
  }

  try {
    // Obtain access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(config);
    } catch (err) {
      return {
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: `Failed to obtain access token: ${(err as Error).message}`,
      };
    }

    // Send to FCM
    const response = await sendToFcm(input, accessToken, config.projectId);

    // Success
    if (response.ok) {
      const data = (await response.json()) as { name: string };
      const messageId = data.name.split('/').pop() ?? `fcm-${randomUUID()}`;
      return { success: true, messageId, mode: 'fcm' };
    }

    // Failure — map error
    const errorBody = await response.json().catch(() => ({}));
    const result = mapFcmErrorToResult(response, errorBody);

    // Trigger invalid-token callback
    if (result.error === 'INVALID_TOKEN' && onInvalidTokenCallback !== null) {
      try {
        onInvalidTokenCallback(input.token);
      } catch (callbackError) {
        console.error('[FCM] Invalid token callback threw:', callbackError);
      }
    }

    return result;
  } catch (err) {
    // Unexpected error — treat as transient
    return {
      success: false,
      error: 'TRANSIENT_ERROR',
      message: `Unexpected error: ${(err as Error).message}`,
    };
  }
}

/**
 * Dispatches multiple notifications in parallel via Promise.all.
 * Returns results in the same order as inputs.
 */
export async function sendBatchNotifications(
  inputs: SendNotificationInput[],
): Promise<SendNotificationResult[]> {
  return Promise.all(inputs.map((input) => sendNotification(input)));
}

/**
 * Registers a callback that fires when FCM returns INVALID_REGISTRATION or
 * UNREGISTERED for a token. Called once by the cleanup listener (4.1.2).
 * Setting it twice replaces the previous callback.
 */
export function setOnInvalidTokenCallback(callback: (token: string) => void): void {
  onInvalidTokenCallback = callback;
}
