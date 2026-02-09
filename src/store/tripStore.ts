import {create} from 'zustand';
import {TripPackResponse} from '../types';

interface TripState {
  currentTrip: TripPackResponse | null;
  scannedCount: number;
  onboardCount: number;
  absentCount: number;
  setCurrentTrip: (trip: TripPackResponse | null) => void;
  incrementScanned: (status: 'onboard' | 'absent') => void;
  resetCounts: () => void;
}

export const useTripStore = create<TripState>(set => ({
  currentTrip: null,
  scannedCount: 0,
  onboardCount: 0,
  absentCount: 0,
  setCurrentTrip: trip =>
    set({
      currentTrip: trip,
      scannedCount: 0,
      onboardCount: 0,
      absentCount: 0,
    }),
  incrementScanned: status =>
    set(state => ({
      scannedCount: state.scannedCount + 1,
      onboardCount:
        status === 'onboard' ? state.onboardCount + 1 : state.onboardCount,
      absentCount:
        status === 'absent' ? state.absentCount + 1 : state.absentCount,
    })),
  resetCounts: () =>
    set({
      scannedCount: 0,
      onboardCount: 0,
      absentCount: 0,
    }),
}));