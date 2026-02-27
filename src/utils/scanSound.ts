// utils/scanSound.ts
import Sound from 'react-native-sound';

Sound.setCategory('Playback', true);

export type ScanSoundType = 'success' | 'error' | 'duplicate';

class ScanSoundManager {
  private static instance: ScanSoundManager;
  private sounds: Map<ScanSoundType, Sound | null> = new Map();
  private isInitialized = false;

  private constructor() {
    this.loadSounds();
  }

  static getInstance(): ScanSoundManager {
    if (!ScanSoundManager.instance) {
      ScanSoundManager.instance = new ScanSoundManager();
    }
    return ScanSoundManager.instance;
  }

  private loadSounds() {
    console.log('🔊 [Sound] Initializing sounds...');

    // ✅ Sound files should be in:
    // Android: android/app/src/main/res/raw/
    // iOS: Added to Xcode project
    const soundConfigs: Array<{ type: ScanSoundType; filename: string }> = [
      { type: 'success', filename: 'success.mp3' },
      { type: 'error', filename: 'error.mp3' },
      { type: 'duplicate', filename: 'duplicate.mp3' },
    ];

    soundConfigs.forEach(({ type, filename }) => {
      try {
        // ✅ Load from app bundle - Sound.MAIN_BUNDLE is the default
        const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.error(`❌ [Sound] Failed to load ${type}:`, error);
            this.sounds.set(type, null);
            return;
          }
          
          console.log(`✅ [Sound] Loaded ${type} sound`);
          this.sounds.set(type, sound);
        });
      } catch (error) {
        console.error(`❌ [Sound] Error loading ${type}:`, error);
        this.sounds.set(type, null);
      }
    });

    this.isInitialized = true;
  }

  play(type: ScanSoundType) {
    if (!this.isInitialized) {
      console.log('⚠️ [Sound] Not initialized yet');
      return;
    }

    const sound = this.sounds.get(type);
    if (!sound) {
      console.log(`⚠️ [Sound] No sound loaded for: ${type}, using vibration fallback`);
      // ✅ Fallback to vibration if sound not loaded
      this.vibrateFallback(type);
      return;
    }

    try {
      // Stop current playback if playing
      sound.stop(() => {
        // Reset to beginning
        sound.setCurrentTime(0);
        
        // Play the sound
        sound.play((success) => {
          if (!success) {
            console.log(`⚠️ [Sound] Playback failed for: ${type}, using vibration`);
            this.vibrateFallback(type);
          } else {
            console.log(`🔊 [Sound] Played ${type}`);
          }
        });
      });
    } catch (error) {
      console.error(`❌ [Sound] Error playing ${type}:`, error);
      this.vibrateFallback(type);
    }
  }

  // ✅ Fallback vibration if sound fails
  private vibrateFallback(type: ScanSoundType) {
    const { Vibration } = require('react-native');
    switch (type) {
      case 'success':
        Vibration.vibrate(100);
        break;
      case 'error':
        Vibration.vibrate([0, 200, 100, 200]);
        break;
      case 'duplicate':
        Vibration.vibrate([0, 100, 100, 100, 100, 100]);
        break;
    }
  }

  release() {
    console.log('🧹 [Sound] Releasing sounds...');
    this.sounds.forEach((sound) => {
      if (sound) {
        sound.release();
      }
    });
    this.sounds.clear();
    this.isInitialized = false;
  }
}

export const scanSound = ScanSoundManager.getInstance();