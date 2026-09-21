import { PermissionsAndroid, Platform } from 'react-native';
import { getDevicePhoneNumber } from '../../../modules/device-phone';
import { isValidPhone, normalizePhone } from './phone';

export interface PhonePermissionPrompt {
  title: string;
  message: string;
  buttonPositive: string;
  buttonNegative: string;
}

/**
 * Best-effort "insert my number": request READ_PHONE_STATE (Android only),
 * read the SIM line number and normalize it to E.164.
 * Returns null when the number cannot be determined.
 */
export async function getMyPhoneNumber(
  prompt: PhonePermissionPrompt,
): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title: prompt.title,
        message: prompt.message,
        buttonPositive: prompt.buttonPositive,
        buttonNegative: prompt.buttonNegative,
      },
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) return null;
  } catch {
    return null;
  }

  const raw = await getDevicePhoneNumber();
  if (!raw) return null;

  const e164 = normalizePhone(raw);
  return isValidPhone(e164) ? e164 : null;
}