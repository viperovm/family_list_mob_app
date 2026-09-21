import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupsStackParamList } from '../../core/navigation/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { useCreateGroup } from '../auth/queries';
import { ApiError } from '../../shared/api/client';

type Props = NativeStackScreenProps<GroupsStackParamList, 'CreateGroup'>;

export function CreateGroupScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const createGroup = useCreateGroup();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      await createGroup.mutateAsync(name.trim());
      navigation.goBack();
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(t('common.error'));
    }
  };

  return (
    <Screen>
      <ScreenContent style={{ justifyContent: 'center' }}>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('groups.createTitle')}</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder={t('groups.createPlaceholder')}
          autoFocus
          error={error ?? undefined}
        />
        <View style={styles.actions}>
          <Button title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} style={styles.flex} />
          <Button
            title={t('common.create')}
            onPress={submit}
            loading={createGroup.isPending}
            disabled={!name.trim()}
            style={styles.flex}
          />
        </View>
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  flex: { flex: 1 },
});