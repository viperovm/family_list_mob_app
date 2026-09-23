import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../features/auth/queries';

/**
 * Keeps lists in sync while the app is running:
 *  - refetches on foreground (AppState -> active);
 *  - refetches when a list-change push arrives (`list_*` events).
 */
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const refreshLists = () => {
      qc.invalidateQueries({ queryKey: queryKeys.lists });
    };

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshLists();
    });

    const notifSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as
        | { type?: string; list_id?: string }
        | undefined;
      if (data?.type?.startsWith('list_')) {
        refreshLists();
        if (data.list_id) {
          qc.invalidateQueries({ queryKey: queryKeys.list(data.list_id) });
        }
      }
    });

    return () => {
      appStateSub.remove();
      notifSub.remove();
    };
  }, [qc]);
}
