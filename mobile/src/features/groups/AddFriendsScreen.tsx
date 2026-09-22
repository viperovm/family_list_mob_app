import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupsStackParamList } from '../../core/navigation/types';
import { useTheme, radius, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { groupsApi } from '../../shared/api/groups';
import { ApiError } from '../../shared/api/client';
import {
  hasContactsPermission,
  loadContacts,
  PhoneContact,
  requestContactsPermission,
  searchContacts,
} from '../../shared/lib/contacts';
import { formatPhoneForDisplay, isValidPhone, normalizePhone } from '../../shared/lib/phone';
import { InviteResponse } from '../../shared/lib/types';

type Props = NativeStackScreenProps<GroupsStackParamList, 'AddFriends'>;

type Status = 'checking' | 'invited' | 'pending' | 'in_group' | 'error';

interface ItemStatus {
  phone: string;
  status: Status;
  message?: string;
}

const DEBOUNCE_MS = 300;

function statusLabel(t: (k: string) => string, status: Status): string {
  switch (status) {
    case 'checking':
      return t('groups.statusChecking');
    case 'invited':
      return t('groups.statusSent');
    case 'pending':
      return t('groups.statusPending');
    case 'in_group':
      return t('groups.statusInGroup');
    default:
      return t('common.error');
  }
}

function statusTone(status: Status): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'checking':
      return 'neutral';
    case 'invited':
      return 'success';
    case 'pending':
      return 'warning';
    case 'in_group':
      return 'primary';
    default:
      return 'danger';
  }
}

export function AddFriendsScreen({ route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const { groupId } = route.params;

  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [manualStatus, setManualStatus] = useState<ItemStatus | null>(null);

  const manualPhone = (() => {
    const trimmed = raw.trim();
    if (trimmed.length < 5) return null;
    const e164 = normalizePhone(trimmed);
    return isValidPhone(e164) ? e164 : null;
  })();

  // Debounce 300 мс перед поиском по контактам.
  useEffect(() => {
    const handler = setTimeout(() => setQuery(raw), DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [raw]);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (permission === 'granted') return true;
    if (permission === 'denied') return false;

    const granted = await hasContactsPermission();
    if (granted) {
      setPermission('granted');
      return true;
    }

    const requested = await requestContactsPermission();
    setPermission(requested ? 'granted' : 'denied');
    return requested;
  }, [permission]);

  const loadList = useCallback(async () => {
    const granted = await ensurePermission();
    if (!granted) return;
    setLoadingContacts(true);
    try {
      const list = await loadContacts();
      setContacts(list);
    } catch {
      // Игнорируем — остаётся ручной ввод номера.
    } finally {
      setLoadingContacts(false);
    }
  }, [ensurePermission]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const found = query.trim().length > 0 ? searchContacts(contacts, query) : [];
  const manualCovered = manualPhone ? found.some((c) => c.phones.includes(manualPhone)) : false;

  const invite = async (phone: string) => {
    setStatuses((prev) => ({ ...prev, [phone]: { phone, status: 'checking' } }));
    try {
      const res: InviteResponse = await groupsApi.invite(groupId, phone);
      const next: Status =
        res.status === 'pending' ? (res.invitee_registered ? 'in_group' : 'pending') : 'invited';
      setStatuses((prev) => ({ ...prev, [phone]: { phone, status: next } }));
    } catch (e) {
      const message = e instanceof ApiError ? e.message : t('common.error');
      setStatuses((prev) => ({ ...prev, [phone]: { phone, status: 'error', message } }));
    }
  };

  const submitManual = async () => {
    Keyboard.dismiss();
    const e164 = normalizePhone(raw);
    if (!isValidPhone(e164)) return;
    setManualStatus({ phone: e164, status: 'checking' });
    try {
      const res: InviteResponse = await groupsApi.invite(groupId, e164);
      const next: Status =
        res.status === 'pending' ? (res.invitee_registered ? 'in_group' : 'pending') : 'invited';
      setManualStatus({ phone: e164, status: next });
      setRaw('');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : t('common.error');
      setManualStatus({ phone: e164, status: 'error', message });
    }
  };

  return (
    <Screen>
      <ScreenContent>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('groups.addFriendsSubtitle')}</Text>

        <TextInput
          value={raw}
          onChangeText={setRaw}
          placeholder={t('groups.searchPlaceholder')}
          placeholderTextColor={c.textSecondary}
          style={[styles.input, { backgroundColor: c.glass, borderColor: c.border, color: c.textPrimary }]}
        />

        {permission === 'denied' ? (
          <View style={styles.permissionCard}>
            <Text style={[styles.permissionText, { color: c.textSecondary }]}>
              {t('groups.contactsPermissionDenied')}
            </Text>
            <Button
              title={t('groups.contactsAllow')}
              variant="secondary"
              style={styles.permissionButton}
              onPress={async () => {
                const granted = await requestContactsPermission();
                setPermission(granted ? 'granted' : 'denied');
                if (granted) void loadList();
              }}
            />
          </View>
        ) : null}

        {loadingContacts ? (
          <ActivityIndicator color={c.primary} style={styles.loader} />
        ) : found.length > 0 ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.results}
            contentContainerStyle={styles.resultsContent}
          >
            {found.map((contact) => (
              <ContactRow key={contact.id} contact={contact} statuses={statuses} onInvite={invite} />
            ))}
          </ScrollView>
        ) : null}

        {!loadingContacts && permission === 'granted' && query.trim().length > 0 && found.length === 0 ? (
          <Text style={[styles.noResults, { color: c.textSecondary }]}>{t('groups.noContactsFound')}</Text>
        ) : null}

        {manualPhone && !manualCovered ? (
          <View style={styles.manualRow}>
            <Pressable style={styles.manualButton} onPress={submitManual}>
              <Text style={[styles.manualText, { color: c.primary }]}>
                {t('groups.addNumber')} {formatPhoneForDisplay(manualPhone)}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {manualStatus ? (
          <View style={styles.manualStatus}>
            <Badge
              label={
                manualStatus.status === 'error' && manualStatus.message
                  ? manualStatus.message
                  : statusLabel(t, manualStatus.status)
              }
              tone={statusTone(manualStatus.status)}
            />
          </View>
        ) : null}
      </ScreenContent>
    </Screen>
  );
}

function ContactRow({
  contact,
  statuses,
  onInvite,
}: {
  contact: PhoneContact;
  statuses: Record<string, ItemStatus>;
  onInvite: (phone: string) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (contact.phones.length > 1) {
    return (
      <View style={[styles.contactCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.contactName, { color: c.textPrimary }]}>{contact.name}</Text>
        {contact.phones.map((phone) => (
          <PhoneOption key={phone} phone={phone} status={statuses[phone]} onInvite={onInvite} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.contactCard, styles.contactRow, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: c.textPrimary }]}>{contact.name}</Text>
        <Text style={[styles.contactPhone, { color: c.textSecondary }]}>
          {formatPhoneForDisplay(contact.phones[0])}
        </Text>
      </View>
      <PhoneAction phone={contact.phones[0]} status={statuses[contact.phones[0]]} onInvite={onInvite} />
    </View>
  );
}

function PhoneOption({
  phone,
  status,
  onInvite,
}: {
  phone: string;
  status: ItemStatus | undefined;
  onInvite: (phone: string) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.phoneOptionRow}>
      <Text style={[styles.contactPhone, { color: c.textSecondary }]}>{formatPhoneForDisplay(phone)}</Text>
      <PhoneAction phone={phone} status={status} onInvite={onInvite} />
    </View>
  );
}

function PhoneAction({
  phone,
  status,
  onInvite,
}: {
  phone: string;
  status: ItemStatus | undefined;
  onInvite: (phone: string) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  if (!status) {
    return <Button title={t('groups.invite')} variant="secondary" style={styles.smallButton} onPress={() => onInvite(phone)} />;
  }
  if (status.status === 'checking') {
    return <Text style={[styles.inlineStatus, { color: c.textSecondary }]}>{t('groups.statusChecking')}</Text>;
  }
  if (status.status === 'error') {
    return (
      <View style={styles.errorRow}>
        <Text style={[styles.errorText, { color: c.danger }]} numberOfLines={2}>
          {status.message ?? t('common.error')}
        </Text>
        <Button title={t('common.retry')} variant="secondary" style={styles.smallButton} onPress={() => onInvite(phone)} />
      </View>
    );
  }
  return <Badge label={statusLabel(t, status.status)} tone={statusTone(status.status)} />;
}

const styles = StyleSheet.create({
  subtitle: { ...typography.bodyMedium, marginBottom: spacing.lg },
  input: {
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...typography.bodyLarge,
  },
  permissionCard: { marginBottom: spacing.lg },
  permissionText: { ...typography.bodyMedium, marginBottom: spacing.md },
  permissionButton: { alignSelf: 'flex-start' },
  loader: { marginVertical: spacing.lg },
  results: { flex: 1 },
  resultsContent: { paddingBottom: spacing.xl },
  noResults: { ...typography.bodyMedium, marginTop: spacing.lg },
  contactCard: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactInfo: { flex: 1 },
  contactName: { ...typography.bodyLarge, marginBottom: spacing.xs },
  contactPhone: { ...typography.bodyMedium },
  phoneOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  smallButton: { height: 40, paddingHorizontal: spacing.md, alignSelf: 'center' },
  inlineStatus: { ...typography.bodyMedium },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  errorText: { ...typography.caption, flexShrink: 1 },
  manualRow: { marginTop: spacing.lg },
  manualButton: { paddingVertical: spacing.sm },
  manualText: { ...typography.bodyLarge, fontWeight: '600' },
  manualStatus: { marginTop: spacing.sm },
});