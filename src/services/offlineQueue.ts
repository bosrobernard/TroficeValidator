import AsyncStorage from '@react-native-async-storage/async-storage';
import {SyncEvent} from '../types';

const KEY = 'OFFLINE_EVENTS_V1';

export async function enqueueEvent(event: SyncEvent): Promise<void> {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || '[]';
    const arr = JSON.parse(raw) as SyncEvent[];
    arr.push(event);
    await AsyncStorage.setItem(KEY, JSON.stringify(arr));
  } catch (error) {
    console.error('Error enqueueing event:', error);
    throw error;
  }
}

export async function getPendingEvents(): Promise<SyncEvent[]> {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || '[]';
    return JSON.parse(raw) as SyncEvent[];
  } catch (error) {
    console.error('Error getting pending events:', error);
    return [];
  }
}

export async function markEventsSynced(eventIds: string[]): Promise<void> {
  try {
    const pending = await getPendingEvents();
    const keep = pending.filter(x => !eventIds.includes(x.eventId));
    await AsyncStorage.setItem(KEY, JSON.stringify(keep));
  } catch (error) {
    console.error('Error marking events synced:', error);
    throw error;
  }
}

export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (error) {
    console.error('Error clearing queue:', error);
    throw error;
  }
}

export async function getQueueCount(): Promise<number> {
  const events = await getPendingEvents();
  return events.length;
}