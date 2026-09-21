import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GroupsStackParamList } from '../../core/navigation/types';
import { useGroups, useIncomingInvitations } from '../auth/queries';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { LoadingState } from '../../shared/ui/LoadingState';

type Nav = NativeStackNavigationProp<GroupsStackParamList>;

export function GroupsHomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();

  const { data: groups = [], isLoading, isError, refetch } = useGroups();
  const { data: invitations = [] } = useIncomingInvitations();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <Screen edges={['top']}>
      <ScreenContent>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('groups.title')}</Text>

        {invitations.length > 0 && (
          <Card style={styles.inviteCard}>
            <Text style={[styles.inviteText, { color: c.textPrimary }]}>
              {t('groups.incomingBadge', { count: invitations.length })}
            </Text>
            <Button
              title={t('groups.invitations')}
              variant="secondary"
              onPress={() => navigation.navigate('Invitations')}
            />
          </Card>
        )}

        {groups.length === 0 ? (
          <EmptyState
            title={t('groups.emptyTitle')}
            subtitle={t('groups.emptySubtitle')}
            action={<Button title={t('groups.create')} onPress={() => navigation.navigate('CreateGroup')} />}
          />
        ) : (
          <FlashList
            data={groups}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Text style={[styles.groupName, { color: c.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.groupMeta, { color: c.textSecondary }]}>
                  {t('groups.membersCount', { count: item.members_count })}
                </Text>
                <View style={styles.row}>
                  <Button
                    title={t('groups.invite')}
                    variant="secondary"
                    onPress={() => navigation.navigate('AddFriends', { groupId: item.id })}
                    style={styles.flex}
                  />
                  <Button
                    title={t('groups.open')}
                    variant="primary"
                    onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
                    style={styles.flex}
                  />
                </View>
              </Card>
            )}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
            contentContainerStyle={styles.listContent}
          />
        )}

        <Button
          title={t('groups.create')}
          onPress={() => navigation.navigate('CreateGroup')}
          style={styles.create}
        />
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.lg },
  inviteCard: { marginBottom: spacing.lg, gap: spacing.md },
  inviteText: { ...typography.bodyMedium },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  groupName: { ...typography.titleMedium },
  groupMeta: { ...typography.caption },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  create: { marginTop: spacing.md },
  listContent: { paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
});