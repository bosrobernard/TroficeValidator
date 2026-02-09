import {create} from 'zustand';

interface DeviceState {
  bootstrapData: {
    device: {
      deviceId: string;
      name?: string | null;
      deviceType: 'DRIVER_APP' | 'VALIDATOR';
      assignedBatchId: string | null;
      assignedVehicleId: string | null;
      status: 'ACTIVE' | 'REVOKED';
    };
    serverTime: string;
    sync: {
      maxBatchSize: number;
      recommendedIntervalSeconds: number;
    };
  } | null;
  setBootstrapData: (data: DeviceState['bootstrapData']) => void;
  clearBootstrapData: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  bootstrapData: null,
  setBootstrapData: (data) => set({bootstrapData: data}),
  clearBootstrapData: () => set({bootstrapData: null}),
}));