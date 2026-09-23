import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ListsStackParamList } from '../../core/navigation/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';
import { useGroups, useCreateList, useGroupMembers } from '../auth/queries';
import { ApiError } from '../../shared/api/client';
import { formatPhoneForDisplay } from '../../shared/lib/phone';

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
  const [access, setAccess] = useState<'all' | 'custom'>('all');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === groupId) ?? groups[0];
  const { data: members = [] } = useGroupMembers(selectedGroup?.id ?? '');

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    if (!name.trim()) return;
    if (!selectedGroup) {
      setError(t('groups.emptyTitle'));
      return;
    }
    setError(null);
    const isCustom = visibility === 'group' && access === 'custom';
    try {
      await createList.mutateAsync({
        groupId: selectedGroup.id,
        name: name.trim(),
        visibility: visibility === 'private' ? 'private' : isCustom ? 'custom' : 'group',
        participantIds: isCustom ? participantIds : [],
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: c.textPrimary }]}>{t('lists.createTitle')}</Text>

          <Input
            label={t('lists.namePlaceholder')}
            value={name}
            onChangeText={setName}
            placeholder={t('lists.namePlaceholder')}
            autoFocus
          />

          <Text style={[styles.section, { color: c.textSecondary }]}>{t('lists.type')}</Text>
          <SegmentedControl
            options={[
              { value: 'private' as const, label: t('lists.typePrivate') },
              { value: 'group' as const, label: t('lists.typeShared') },
            ]}
            value={visibility}
            onChange={setVisibility}
          />

          {visibility === 'group' && groups.length > 0 && (
            <>
              <Text style={[styles.section, { color: c.textSecondary }]}>{t('lists.groupLabel')}</Text>
              <View style={styles.list}>
                {groups.map((g) => {
                  const selected = selectedGroup?.id === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      style={[styles.row, { borderColor: selected ? c.primary : c.border }]}
                      onPress={() => setGroupId(g.id)}
                    >
                      <View style={[styles.radio, { borderColor: selected ? c.primary : c.border }]}>
                        {selected ? <View style={[styles.radioDot, { backgroundColor: c.primary }]} /> : null}
                      </View>
                      <Text style={[styles.rowText, { color: c.textPrimary }]}>{g.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.section, { color: c.textSecondary }]}>{t('lists.accessLabel')}</Text>
              <SegmentedControl
                options={[
                  { value: 'all' as const, label: t('lists.accessAll') },
                  { value: 'custom' as const, label: t('lists.accessCustom') },
                ]}
                value={access}
                onChange={setAccess}
              />

              {access === 'custom' && (
                <View style={styles.list}>
                  {members.length === 0 ? (
                    <Text style={[styles.caption, { color: c.textSecondary }]}>
                      {t('groups.emptyTitle')}
                    </Text>
                  ) : (
                    members.map((m) => {
                      const checked = participantIds.includes(m.user.id);
                      return (
                        <Pressable
                          key={m.id}
                          style={[styles.row, { borderColor: checked ? c.primary : c.border }]}
                          onPress={() => toggleParticipant(m.user.id)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              checked && { backgroundColor: c.primary, borderColor: c.primary },
                            ]}
                          >
                            {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                          </View>
                          <Text style={[styles.rowText, { color: c.textPrimary }]}>
                            {formatPhoneForDisplay(m.user.phone)}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} style={styles.flex} />
          <Button
            title={t('common.create')}
            onPress={submit}
            loading={createList.isPending}
            disabled={!name.trim() || !selectedGroup}
            style={styles.flex}
          />
        </View>
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.lg },
  title: { ...typography.titleLarge, marginBottom: spacing.xl },
  section: { ...typography.caption, marginBottom: spacing.sm, marginTop: spacing.lg },
  caption: { ...typography.caption },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
  rowText: { ...typography.bodyLarge, flex: 1 },
  error: { ...typography.bodyMedium, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  flex: { flex: 1 },
});