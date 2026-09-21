import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupsStackParamList } from '../../core/navigation/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Badge } from '../../shared/ui/Badge';
import { groupsApi } from '../../shared/api/groups';
import { maskPhoneInput, normalizePhone, isValidPhone } from '../../shared/lib/phone';
import { ApiError } from '../../shared/api/client';

type Props = NativeStackScreenProps<GroupsStackParamList, 'AddFriends'>;

type InviteStatus = 'idle' | 'sending' | 'sent' | 'error';

export function AddFriendsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const { groupId } = route.params;

  const [raw, setRaw] = useState('');
  const [status, setStatus] = useState<InviteStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const masked = maskPhoneInput(raw);
  const digits = masked.replace(/\D/g, '');
  const valid = isValidPhone(`+${digits}`);

  const invite = async () => {
    setStatus('sending');
    setMessage(null);
    try {
      await groupsApi.invite(groupId, normalizePhone(`+${digits}`));
      setStatus('sent');
      setMessage(t('groups.statusSent'));
      setRaw('');
    } catch (e) {
      setStatus('error');
      if (e instanceof ApiError) setMessage(e.message);
      else setMessage(t('common.error'));
    }
  };

  return (
    <Screen>
      <ScreenContent>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('groups.addFriendsTitle')}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {t('groups.addPhone')}
        </Text>

        <Input
          value={masked}
          onChangeText={setRaw}
          placeholder={t('groups.phonePlaceholder')}
          keyboardType="phone-pad"
        />

        {status === 'sent' && <Badge label={t('groups.statusSent')} tone="success" />}
        {status === 'error' && message ? (
          <Text style={[styles.error, { color: c.danger }]}>{message}</Text>
        ) : null}

        <Button
          title={t('groups.invite')}
          onPress={invite}
          loading={status === 'sending'}
          disabled={!valid}
        />
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMedium, marginBottom: spacing.xl },
  error: { ...typography.bodyMedium, marginVertical: spacing.lg },
});