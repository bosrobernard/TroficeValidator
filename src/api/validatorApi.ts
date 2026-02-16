import {
  BootstrapResponse,
  TripPackResponse,
  SyncEvent,
  SyncResponse,
  CurrentTripResponse,
} from '../types';
import {
  getProvisioning,
  getBearerToken,
  saveBearerToken,
} from '../services/deviceStorage';

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

type RequestOpts = {
  method?: 'GET' | 'POST';
  path: string;
  body?: any;
  headers?: Record<string, string>;
  ifNoneMatch?: string;
  useValidatorBase?: boolean;
  skipAuth?: boolean;
};

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return b + p;
}

export class ValidatorApi {
  private apiBase: string;

  constructor(apiBase: string) {
    this.apiBase = apiBase;
  }

  private async request<T>(
    opts: RequestOpts,
    retryCount = 0, // ✅ Add retry counter
  ): Promise<ApiResult<T> | { notModified: true }> {
    const credentials = await getProvisioning();
    const bearerToken = await getBearerToken();

    // Use the API base, but strip /validator if useValidatorBase is false
    let base = credentials?.apiBase || this.apiBase;
    if (opts.useValidatorBase === false) {
      base = base.replace(/\/validator$/, '');
    }

    console.log('🔐 [API] Auth state:', {
      hasCredentials: !!credentials,
      hasToken: !!bearerToken,
      tokenPreview: bearerToken ? `${bearerToken.substring(0, 20)}...` : 'none',
      deviceId: credentials?.deviceId,
      apiBase: base,
      skipAuth: opts.skipAuth,
      retryCount, // ✅ Log retry count
    });

    // ✅ Check for bearer token if authentication is required
    if (!opts.skipAuth && !bearerToken) {
      console.log(
        '❌ [API] No bearer token available - authentication required',
      );

      // ✅ Only retry once to prevent infinite loop
      if (retryCount === 0 && credentials?.deviceId && credentials?.deviceKey) {
        console.log('🔄 [API] Attempting to re-bootstrap (retry 1/1)...');
        const bootstrapResult = await this.bootstrap();

        if (bootstrapResult.success) {
          console.log('✅ [API] Re-bootstrap successful, retrying request');
          // Token is now saved, retry the original request with incremented counter
          return this.request(opts, retryCount + 1);
        } else {
          console.error(
            '❌ [API] Re-bootstrap failed:',
            bootstrapResult.message,
          );
        }
      } else if (retryCount > 0) {
        console.error(
          '❌ [API] Already retried once, preventing infinite loop',
        );
      }

      return {
        success: false,
        message: 'Not authenticated. Please re-provision your device.',
      };
    }

    const url = joinUrl(base, opts.path);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(opts.headers || {}),
    };

    // ✅ Add Bearer token to Authorization header if not skipped
    if (!opts.skipAuth && bearerToken) {
      headers['authorization'] = `Bearer ${bearerToken}`;
      console.log('🔑 [API] Using Bearer token authentication');
    }

    if (opts.ifNoneMatch) {
      headers['if-none-match'] = opts.ifNoneMatch;
    }

    // ✅ Log request details
    console.log('📡 [API] Making request:', {
      method: opts.method || 'GET',
      url: url,
      path: opts.path,
    });

    console.log('📋 [API] Request Headers:', JSON.stringify(headers, null, 2));

    if (opts.body) {
      console.log('📦 [API] Request Body:', JSON.stringify(opts.body, null, 2));
    }

    try {
      const res = await fetch(url, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });

      console.log('📥 [API] Response status:', res.status);
      console.log(
        '📥 [API] Response headers:',
        JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2),
      );

      if (res.status === 304) {
        console.log('✅ [API] Response: 304 Not Modified');
        return { notModified: true };
      }

      const json = await res.json().catch(() => null);

      console.log('📥 [API] Response body:', JSON.stringify(json, null, 2));

      if (!res.ok) {
        console.log('❌ [API] Request failed:', {
          status: res.status,
          message: json?.message || `HTTP ${res.status}`,
        });
        return {
          success: false,
          message: json?.message || `HTTP ${res.status}`,
        };
      }

      if (!json?.success) {
        console.log('❌ [API] API returned error:', json?.message);
        return { success: false, message: json?.message || 'Request failed' };
      }

      console.log('✅ [API] Request successful', json);
      return { success: true, data: json.data as T };
    } catch (error: any) {
      console.log('❌ [API] Network error:', error.message);
      console.error('❌ [API] Full error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }

  // ✅ Updated bootstrap method - sends credentials in payload and saves token
  // ✅ Updated bootstrap method - handles token specially
  async bootstrap(): Promise<ApiResult<BootstrapResponse>> {
    const credentials = await getProvisioning();

    if (!credentials?.deviceId || !credentials?.deviceKey) {
      console.log('❌ [API] Cannot bootstrap - device credentials not found');
      return { success: false, message: 'Device credentials not found' };
    }

    // ✅ Make the request manually to access the full response including token
    const url = joinUrl(
      credentials?.apiBase || this.apiBase,
      '/device/bootstrap/login',
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: credentials.deviceId,
          apiKey: credentials.deviceKey,
        }),
      });

      const json = await res.json();
      console.log('Bootstrap response:', json);

      if (!res.ok || !json?.success) {
        return {
          success: false,
          message: json?.message || `HTTP ${res.status}`,
        };
      }

      // ✅ Token is at the top level of the response
      if (json.token) {
        try {
          console.log('💾 [API] Saving bearer token...');
          await saveBearerToken(json.token);
          console.log('✅ [API] Bearer token saved successfully');

          // ✅ Verify it was actually saved
          const verifyToken = await getBearerToken();
          if (verifyToken === json.token) {
            console.log('✅ [API] Token verified in storage');
          } else {
            console.error(
              '❌ [API] Token verification failed - token in storage does not match',
            );
            return {
              success: false,
              message: 'Failed to save authentication token',
            };
          }
        } catch (error: any) {
          console.error('❌ [API] Failed to save bearer token:', error);
          return {
            success: false,
            message: 'Failed to save authentication token',
          };
        }
      } else {
        console.error('❌ [API] No token in bootstrap response');
        return {
          success: false,
          message: 'No authentication token received',
        };
      }

      // ✅ Return the data portion
      return { success: true, data: json.data as BootstrapResponse };
    } catch (error: any) {
      console.error('❌ [API] Bootstrap error:', error);
      return {
        success: false,
        message: error.message || 'Bootstrap failed',
      };
    }
  }

  async downloadTripPack(
    tripId: string,
    etag?: string,
  ): Promise<ApiResult<TripPackResponse> | { notModified: true }> {
    return await this.request<TripPackResponse>({
      path: `/trips/${tripId}/v2/pack`,
      ifNoneMatch: etag,
    });
  }

  async syncEvents(payload: {
    tripId: string;
    manifestVersion?: string;
    events: SyncEvent[];
  }): Promise<ApiResult<SyncResponse>> {
    const r = await this.request<SyncResponse>({
      method: 'POST',
      path: '/events/sync',
      body: payload,
    });
    if ('notModified' in r) {
      return { success: false, message: 'Unexpected 304' };
    }
    return r as ApiResult<SyncResponse>;
  }

  async getCurrentTripByBatchId(
    batchId: string,
  ): Promise<ApiResult<CurrentTripResponse>> {
    const r = await this.request<CurrentTripResponse>({
      path: `/${batchId}/trip`,
    });
    if ('notModified' in r) {
      return { success: false, message: 'Unexpected 304' };
    }
    return r as ApiResult<CurrentTripResponse>;
  }
}
