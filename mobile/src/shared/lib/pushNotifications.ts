import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { devicesApi } from '../api/devices';

// Показываем уведомление, когда приложение открыто (SDK 54+ использует banner/list).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  const easConfig = Constants.easConfig as { projectId?: string } | null | undefined;
  if (easConfig?.projectId) return easConfig.projectId;
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId;
}

/**
 * Запрашивает разрешение на уведомления, получает Expo push-токен и регистрирует
 * устройство на бэкенде. Молча возвращает null, если пуши ещё не настроены
 * (нет `extra.eas.projectId` / `google-services.json`) — приложение продолжает работать.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Основные',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse?.data;
    if (!token) return null;

    await devicesApi.register(token);
    return token;
  } catch {
    // Пуши не настроены (нет projectId или FCM-креденшелов) — это не ошибка приложения.
    return null;
  }
}
