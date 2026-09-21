import React, { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ListsStackParamList } from '../../core/navigation/types';
import { useLists, useArchiveList, useRestoreList, useDuplicateList } from './queries';
import { ShoppingList, ListStatusFilter, ListSection } from '../../shared/lib/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Card } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { LoadingState } from '../../shared/ui/LoadingState';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';

type Nav = NativeStackNavigationProp<ListsStackParamList>;

function ListCard({
  list,
  onOpen,
  onArchive,
  onRestore,
  onDuplicate,
}: {
  list: ShoppingList;
  onOpen: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDuplicate: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const isArchived = list.status === 'archived';
  const { total, done } = list.progress;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]} numberOfLines={1}>
          {list.name}
        </Text>
        <Badge label={list.group.name} tone="primary" />
      </View>
      <Text style={[styles.cardMeta, { color: c.textSecondary }]}>
        {list.visibility === 'private'
          ? t('lists.typePrivate')
          : t('lists.itemCount', { done, total })}
      </Text>
      <View style={styles.cardActions}>
        {isArchived ? (
          <Button title={t('lists.restore')} variant="secondary" onPress={onRestore} style={styles.flexBtn} />
        ) : (
          <Button title={t('lists.finish')} variant="secondary" onPress={onArchive} style={styles.flexBtn} />
        )}
        <Button title={t('lists.duplicate')} variant="secondary" onPress={onDuplicate} style={styles.flexBtn} />
      </View>
      <Button title={t('groups.open')} variant="ghost" onPress={onOpen} style={styles.openBtn} />
    </Card>
  );
}

export function ListsHomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();

  const [section, setSection] = useState<ListSection>('all');
  const [status, setStatus] = useState<ListStatusFilter>('active');
  const [groupId] = useState<string | undefined>(undefined);

  const { data: lists = [], isLoading, isError, refetch } = useLists({
    section,
    status,
    group_id: groupId,
  });

  const archive = useArchiveList();
  const restore = useRestoreList();
  const duplicate = useDuplicateList();

  if (isLoading) return <LoadingState />;

  return (
    <Screen>
      <ScreenContent>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('lists.title')}</Text>
        <SegmentedControl
          options={[
            { value: 'shared' as const, label: t('lists.shared') },
            { value: 'private' as const, label: t('lists.my') },
          ]}
          value={section === 'private' ? 'private' : 'shared'}
          onChange={(v) => setSection(v === 'private' ? 'private' : 'shared')}
        />
        <View style={{ height: spacing.sm }} />
        <SegmentedControl
          options={[
            { value: 'active' as const, label: t('lists.active') },
            { value: 'archived' as const, label: t('lists.archive') },
          ]}
          value={status}
          onChange={setStatus}
        />

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : lists.length === 0 ? (
          <EmptyState
            title={t('lists.emptyTitle')}
            subtitle={t('lists.emptySubtitle')}
            action={<Button title={t('lists.create')} onPress={() => navigation.navigate('CreateList')} />}
          />
        ) : (
          <FlashList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListCard
                list={item}
                onOpen={() => navigation.navigate('ListDetail', { listId: item.id })}
                onArchive={() => archive.mutate(item.id)}
                onRestore={() => restore.mutate(item.id)}
                onDuplicate={() => duplicate.mutate({ id: item.id, mode: 'all' })}
              />
            )}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          />
        )}
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardTitle: { ...typography.titleMedium, flex: 1, marginRight: spacing.sm },
  cardMeta: { ...typography.caption, marginBottom: spacing.md },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  flexBtn: { flex: 1 },
  openBtn: { height: 40, marginTop: spacing.xs },
});