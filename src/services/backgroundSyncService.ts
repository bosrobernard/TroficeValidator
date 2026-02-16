// services/backgroundSyncService.ts
import { AppState, AppStateStatus } from 'react-native';
import { ValidatorApi } from '../api/validatorApi';
import {
  getPendingEvents,
  markEventsSynced,
  getQueueCount,
} from './offlineQueue';

class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private syncTimerRef: number | null = null;
  private isSyncing: boolean = false;
  private isEnabled: boolean = true;
  private syncInterval: number = 60000; // Default 60 seconds
  private api: ValidatorApi;
  private appStateSubscription: any = null;
  private currentAppState: AppStateStatus = AppState.currentState;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.api = new ValidatorApi('https://trofice.com/api/validator');
    this.setupAppStateListener();
  }

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  // Add listener for sync completion
  addListener(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    const wasInBackground =
      this.currentAppState.match(/inactive|background/) &&
      nextAppState === 'active';
    const wentToBackground = nextAppState.match(/inactive|background/);

    if (wasInBackground && this.isEnabled) {
      console.log('📱 [BackgroundSync] App came to foreground - resuming');
      this.start();
    } else if (wentToBackground) {
      console.log('📱 [BackgroundSync] App went to background - pausing');
      this.pause();
    }

    this.currentAppState = nextAppState;
  }

  setInterval(seconds: number) {
    this.syncInterval = seconds * 1000;
    if (this.isEnabled) {
      this.restart();
    }
  }

  enable() {
    this.isEnabled = true;
    this.start();
  }

  disable() {
    this.isEnabled = false;
    this.stop();
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  start() {
    if (!this.isEnabled) return;

    this.stop(); // Clear any existing timer

    this.syncTimerRef = setInterval(() => {
      this.performSync();
    }, this.syncInterval) as unknown as number;

    console.log(
      `⏰ [BackgroundSync] Started - interval: ${this.syncInterval / 1000}s`,
    );

    // Perform initial sync
    this.performSync();
  }

  pause() {
    this.stop();
  }

  stop() {
    if (this.syncTimerRef) {
      clearInterval(this.syncTimerRef);
      this.syncTimerRef = null;
      console.log('⏸️ [BackgroundSync] Stopped');
    }
  }

  restart() {
    this.stop();
    this.start();
  }

  async performSync(currentTripId?: string, manifestVersion?: string): Promise<{
    success: boolean;
    synced?: number;
    rejected?: number;
  }> {
    if (this.isSyncing) {
      console.log('⚠️ [BackgroundSync] Already syncing, skipping');
      return { success: false };
    }

    try {
      const count = await getQueueCount();
      if (count === 0) {
        console.log('ℹ️ [BackgroundSync] No events to sync');
        return { success: true, synced: 0, rejected: 0 };
      }

      if (!currentTripId) {
        console.log('⚠️ [BackgroundSync] No trip ID provided, skipping');
        return { success: false };
      }

      this.isSyncing = true;
      console.log(`🔄 [BackgroundSync] Syncing ${count} events...`);

      const pending = await getPendingEvents();
      const result = await this.api.syncEvents({
        tripId: currentTripId,
        manifestVersion: manifestVersion,
        events: pending,
      });

      if (!result.success) {
        console.log('❌ [BackgroundSync] Failed:', result.message);
        return { success: false };
      }

      const syncedIds = result.data.results
        .filter(r => r.accepted || r.duplicate)
        .map(r => r.eventId!)
        .filter(Boolean);

      await markEventsSynced(syncedIds);

      const rejected = result.data.results.filter(
        r => !r.accepted && !r.duplicate,
      ).length;

      console.log(
        `✅ [BackgroundSync] Completed - ${syncedIds.length} synced, ${rejected} rejected`,
      );

      // Notify listeners
      this.notifyListeners();

      return { success: true, synced: syncedIds.length, rejected };
    } catch (error: any) {
      console.error('❌ [BackgroundSync] Error:', error.message);
      return { success: false };
    } finally {
      this.isSyncing = false;
    }
  }

  async forceSyncNow(
    currentTripId: string,
    manifestVersion?: string,
  ): Promise<{
    success: boolean;
    synced?: number;
    rejected?: number;
  }> {
    console.log('🚀 [BackgroundSync] Force sync requested');
    return await this.performSync(currentTripId, manifestVersion);
  }

  destroy() {
    this.stop();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.listeners.clear();
  }
}

export default BackgroundSyncService;