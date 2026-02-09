import * as Keychain from 'react-native-keychain';
import {DeviceCredentials} from '../types';

const SERVICE = 'trofice_validator_device';

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
  } catch (error) {
    console.error('Error saving provisioning:', error);
    throw error;
  }
}

export async function getProvisioning(): Promise<DeviceCredentials | null> {
  try {
    const creds = await Keychain.getGenericPassword({service: SERVICE});
    const base = await Keychain.getInternetCredentials(`${SERVICE}_base`);

    if (!creds) return null;

    return {
      deviceId: creds.username,
      deviceKey: creds.password,
      apiBase: base ? base.password : undefined,
    };
  } catch (error) {
    console.error('Error getting provisioning:', error);
    return null;
  }
}

export async function clearProvisioning(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
    await Keychain.resetInternetCredentials({
      service: `${SERVICE}_base`,
    });
  } catch (error) {
    console.error('Error clearing provisioning:', error);
    throw error;
  }
}
