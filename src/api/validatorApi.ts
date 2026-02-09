import {
  BootstrapResponse,
  TripPackResponse,
  SyncEvent,
  SyncResponse,
  CurrentTripResponse,
} from '../types';
import { getProvisioning } from '../services/deviceStorage';

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
  ): Promise<ApiResult<T> | { notModified: true }> {
    const credentials = await getProvisioning();
    // Use the API base, but strip /validator if useValidatorBase is false
    let base = credentials?.apiBase || this.apiBase;
    if (opts.useValidatorBase === false) {
      base = base.replace(/\/validator$/, '');
    }

    console.log('🔐 [API] Credentials loaded:', {
      hasCredentials: !!credentials,
      deviceId: credentials?.deviceId,
      apiBase: base,
    });

    if (!credentials?.deviceId || !credentials?.deviceKey) {
      console.log('❌ [API] Device not provisioned');
      return { success: false, message: 'Device not provisioned' };
    }

    const url = joinUrl(base, opts.path);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-device-id': credentials.deviceId,
      'x-device-key': credentials.deviceKey,
      ...(opts.headers || {}),
    };

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

      console.log('✅ [API] Request successful');
      return { success: true, data: json.data as T };
    } catch (error: any) {
      console.log('❌ [API] Network error:', error.message);
      console.error('❌ [API] Full error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }

  async bootstrap(): Promise<ApiResult<BootstrapResponse>> {
    const r = await this.request<BootstrapResponse>({
      path: '/device/bootstrap',
    });
    console.log('Bootstrap response:', r);
    if ('notModified' in r) {
      return { success: false, message: 'Unexpected 304' };
    }
    return r as ApiResult<BootstrapResponse>;
  }

  async downloadTripPack(
    tripId: string,
    etag?: string,
  ): Promise<ApiResult<TripPackResponse> | { notModified: true }> {
    return await this.request<TripPackResponse>({
      path: `/trips/${tripId}/pack`,
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
      path: '/validator/events/sync',
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
