import React from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupsStackParamList } from '../../core/navigation/types';
import { useGroup, useGroupMembers } from '../auth/queries';
import { groupsApi } from '../../shared/api/groups';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { LoadingState } from '../../shared/ui/LoadingState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../auth/queries';
import { formatPhoneForDisplay } from '../../shared/lib/phone';

type Props = NativeStackScreenProps<GroupsStackParamList, 'GroupDetail'>;

export function GroupDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const qc = useQueryClient();
  const { groupId } = route.params;

  const { data: group, isLoading, isError, refetch } = useGroup(groupId);
  const { data: members = [] } = useGroupMembers(groupId);

  if (isLoading) return <LoadingState />;
  if (isError || !group) return <ErrorState onRetry={() => refetch()} />;

  const confirmLeave = () => {
    Alert.alert(t('settings.leaveGroupTitle'), t('settings.leaveGroupBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.leaveGroup'),
        style: 'destructive',
        onPress: async () => {
          await groupsApi.leave(groupId);
          qc.invalidateQueries({ queryKey: queryKeys.groups });
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScreenContent>
        <Text style={[styles.title, { color: c.textPrimary }]}>{group.name}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {t('groups.membersCount', { count: group.members_count })}
        </Text>

        <Button
          title={t('groups.addFriends')}
          onPress={() => navigation.navigate('AddFriends', { groupId })}
          style={{ marginBottom: spacing.md }}
        />

        <ScrollView>
          {members.map((m) => (
            <Card key={m.id} style={styles.member}>
              <Text style={[styles.memberPhone, { color: c.textPrimary }]}>
                {formatPhoneForDisplay(m.user.phone)}
              </Text>
              <Text style={[styles.memberRole, { color: c.textSecondary }]}>{m.role}</Text>
            </Card>
          ))}
        </ScrollView>

        <Button title={t('settings.leaveGroup')} variant="danger" onPress={confirmLeave} style={{ marginTop: spacing.lg }} />
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.xs },
  subtitle: { ...typography.bodyMedium, marginBottom: spacing.xl },
  member: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  memberPhone: { ...typography.bodyLarge },
  memberRole: { ...typography.caption },
});