export interface DeviceCredentials {
  deviceId: string;
  deviceKey: string;
  apiBase?: string;
}

export interface BootstrapResponse {
  device: {
    deviceId: string;
    name?: string | null;
    deviceType: 'DRIVER_APP' | 'VALIDATOR';
    assignedBatchId?: string | null;
    assignedVehicleId?: string | null;
    status: 'ACTIVE' | 'REVOKED';
  };
  serverTime: string;
  sync: {
    maxBatchSize: number;
    recommendedIntervalSeconds: number;
  };
}

export interface TripPackResponse {
  manifestVersion: string;
  trip: {
    tripId: string;
    batchId: string;
    routeId: string;
    tripDate: string;
    onTrip: boolean;
    validFrom: string;
    validTo: string;
    fare: number;
    currency: string;
  };
  manifest: Array<{
    memberId: string;
    customerId: string;
    uniqueCodeHash: string | null;
    active: boolean;
    canBoard?: boolean;
    reason?: string | null;
    isPAYG?: boolean;
    spendable?: number;
  }>;
}

export interface SyncEvent {
  eventId: string;
  memberId: string;
  customerId: string;
  status: 'onboard' | 'absent';
  operation?: 'manual' | 'card' | 'qrcode';
  remarks?: string;
  scannedAt?: string;
}

export interface SyncResponse {
  tripId: string;
  manifestVersion: string | null;
  processed: number;
  results: Array<{
    eventId: string | null;
    accepted: boolean;
    charged: boolean;
    message: string;
    duplicate?: boolean;
  }>;
}