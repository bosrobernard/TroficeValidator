import {
  BootstrapResponse,
  TripPackResponse,
  SyncEvent,
  SyncResponse,
} from '../types';
import {getProvisioning} from '../services/deviceStorage';

export type ApiResult<T> =
  | {success: true; data: T}
  | {success: false; message: string};

type RequestOpts = {
  method?: 'GET' | 'POST';
  path: string;
  body?: any;
  headers?: Record<string, string>;
  ifNoneMatch?: string;
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
  ): Promise<ApiResult<T> | {notModified: true}> {
    const credentials = await getProvisioning();
    const base = credentials?.apiBase || this.apiBase;

    if (!credentials?.deviceId || !credentials?.deviceKey) {
      return {success: false, message: 'Device not provisioned'};
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

    try {
      const res = await fetch(url, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });

      if (res.status === 304) {
        return {notModified: true};
      }

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          message: json?.message || `HTTP ${res.status}`,
        };
      }

      if (!json?.success) {
        return {success: false, message: json?.message || 'Request failed'};
      }

      return {success: true, data: json.data as T};
    } catch (error: any) {
      return {success: false, message: error.message || 'Network error'};
    }
  }

  async bootstrap(): Promise<ApiResult<BootstrapResponse>> {
    const r = await this.request<BootstrapResponse>({
      path: '/device/bootstrap',
    });
    if ('notModified' in r) {
      return {success: false, message: 'Unexpected 304'};
    }
    return r as ApiResult<BootstrapResponse>;
  }

  async downloadTripPack(
    tripId: string,
    etag?: string,
  ): Promise<ApiResult<TripPackResponse> | {notModified: true}> {
    return await this.request<TripPackResponse>({
      path: `/validator/trips/${tripId}/pack`,
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
      return {success: false, message: 'Unexpected 304'};
    }
    return r as ApiResult<SyncResponse>;
  }
}