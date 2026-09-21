import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ListsStackParamList } from '../../core/navigation/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';
import { useGroups, useCreateList } from '../auth/queries';
import { ApiError } from '../../shared/api/client';

type Props = NativeStackScreenProps<ListsStackParamList, 'CreateList'>;

export function CreateListScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const { data: groups = [] } = useGroups();
  const createList = useCreateList();

  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'group'>('group');
  const [groupId, setGroupId] = useState<string | undefined>(route.params?.groupId);
  const [error, setError] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === groupId) ?? groups[0];

  const submit = async () => {
    if (!name.trim()) return;
    if (visibility === 'group' && !selectedGroup) return;
    setError(null);
    try {
      await createList.mutateAsync({
        groupId: selectedGroup.id,
        name: name.trim(),
        visibility: visibility === 'private' ? 'private' : 'group',
      });
      navigation.goBack();
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(t('common.error'));
    }
  };

  return (
    <Screen>
      <ScreenContent>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('lists.createTitle')}</Text>

        <Input
          label={t('lists.namePlaceholder')}
          value={name}
          onChangeText={setName}
          placeholder={t('lists.namePlaceholder')}
          autoFocus
        />

        <Text style={[styles.section, { color: c.textSecondary }]}>{t('lists.typeShared')}</Text>
        <SegmentedControl
          options={[
            { value: 'private' as const, label: t('lists.typePrivate') },
            { value: 'group' as const, label: t('lists.typeShared') },
          ]}
          value={visibility}
          onChange={setVisibility}
        />

        {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} style={styles.flex} />
          <Button
            title={t('common.create')}
            onPress={submit}
            loading={createList.isPending}
            disabled={!name.trim() || (visibility === 'group' && !selectedGroup)}
            style={styles.flex}
          />
        </View>
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.xl },
  section: { ...typography.caption, marginBottom: spacing.sm, marginTop: spacing.lg },
  error: { ...typography.bodyMedium, marginTop: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxl },
  flex: { flex: 1 },
});