import { requireOptionalNativeModule } from 'expo-modules-core';

type DevicePhoneNativeModule = {
  /** Returns the device's own line number (SIM), or null when unavailable. */
  getLineNumber(): Promise<string | null>;
};

const nativeModule = requireOptionalNativeModule<DevicePhoneNativeModule>('DevicePhone');

/**
 * Read the device's own phone number from the SIM card.
 * Returns null on iOS/web, on the emulator, when the permission is denied,
 * or when the carrier does not provision the number into the SIM.
 */
export async function getDevicePhoneNumber(): Promise<string | null> {
  if (!nativeModule) return null;
  try {
    return (await nativeModule.getLineNumber()) ?? null;
  } catch {
    return null;
  }
}
