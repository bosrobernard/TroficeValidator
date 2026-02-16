import * as Keychain from 'react-native-keychain';
import { DeviceCredentials } from '../types';

const SERVICE = 'trofice_validator_device';
const TOKEN_SERVICE = 'trofice_validator_token';

export async function saveProvisioning(
  credentials: DeviceCredentials,
): Promise<void> {
  try {
    await Keychain.setGenericPassword(
      credentials.deviceId,
      credentials.deviceKey,
      {
        service: SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );

    if (credentials.apiBase) {
      await Keychain.setInternetCredentials(
        `${SERVICE}_base`,
        'apiBase',
        credentials.apiBase,
      );
    }

    console.log('✅ [Storage] Provisioning saved');
  } catch (error) {
    console.error('❌ [Storage] Error saving provisioning:', error);
    throw error;
  }
}

export async function getProvisioning(): Promise<DeviceCredentials | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    const base = await Keychain.getInternetCredentials(`${SERVICE}_base`);

    if (!creds) return null;

    return {
      deviceId: creds.username,
      deviceKey: creds.password,
      apiBase: base ? base.password : undefined,
    };
  } catch (error) {
    console.error('❌ [Storage] Error getting provisioning:', error);
    return null;
  }
}

export async function clearProvisioning(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
    await Keychain.resetInternetCredentials({
      server: `${SERVICE}_base`,
    });
    await clearBearerToken();
    console.log('✅ [Storage] Provisioning cleared');
  } catch (error) {
    console.error('❌ [Storage] Error clearing provisioning:', error);
    throw error;
  }
}

// ✅ Token management functions with retry logic
export async function saveBearerToken(token: string): Promise<void> {
  try {
    console.log('💾 [Storage] Attempting to save bearer token...');
    console.log('💾 [Storage] Token length:', token.length);
    console.log('💾 [Storage] Token preview:', token.substring(0, 30) + '...');

    const result = await Keychain.setGenericPassword('bearer_token', token, {
      service: TOKEN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    console.log('💾 [Storage] Keychain setGenericPassword result:', result);

    if (!result) {
      throw new Error('Keychain returned false when saving token');
    }

    // ✅ Wait a tiny bit to ensure write is complete

    await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

    // ✅ Verify the token was saved by immediately reading it back
    const verified = await Keychain.getGenericPassword({
      service: TOKEN_SERVICE,
    });

    if (!verified) {
      console.error(
        '❌ [Storage] Token verification failed - nothing in keychain',
      );
      throw new Error('Token not found in keychain after save');
    }

    if (verified.password !== token) {
      console.error('❌ [Storage] Token verification failed - mismatch');
      console.error('Expected:', token.substring(0, 30) + '...');
      console.error('Got:', verified.password.substring(0, 30) + '...');
      throw new Error('Token mismatch after save');
    }

    console.log('✅ [Storage] Bearer token saved and verified successfully');
  } catch (error) {
    console.error('❌ [Storage] Error saving bearer token:', error);
    throw error;
  }
}

export async function getBearerToken(): Promise<string | null> {
  try {
    console.log(
      '🔍 [Storage] Attempting to get bearer token from service:',
      TOKEN_SERVICE,
    );
    const creds = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });

    if (!creds) {
      console.log('ℹ️ [Storage] No bearer token found in keychain');
      return null;
    }

    console.log('✅ [Storage] Bearer token retrieved successfully');
    console.log('✅ [Storage] Token length:', creds.password.length);
    console.log(
      '✅ [Storage] Token preview:',
      creds.password.substring(0, 30) + '...',
    );
    return creds.password;
  } catch (error) {
    console.error('❌ [Storage] Error getting bearer token:', error);
    return null;
  }
}

export async function clearBearerToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
    console.log('✅ [Storage] Bearer token cleared');
  } catch (error) {
    console.error('❌ [Storage] Error clearing bearer token:', error);
    throw error;
  }
}
