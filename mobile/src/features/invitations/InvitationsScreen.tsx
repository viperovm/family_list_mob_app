import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useIncomingInvitations, queryKeys } from '../auth/queries';
import { invitationsApi } from '../../shared/api/groups';
import { formatPhoneForDisplay } from '../../shared/lib/phone';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { LoadingState } from '../../shared/ui/LoadingState';

export function InvitationsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const qc = useQueryClient();

  const { data: invitations = [], isLoading } = useIncomingInvitations();

  if (isLoading) return <LoadingState />;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: queryKeys.invitations });
    qc.invalidateQueries({ queryKey: queryKeys.groups });
  };

  return (
    <Screen>
      <ScreenContent>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('invitations.title')}</Text>

        {invitations.length === 0 ? (
          <EmptyState title={t('invitations.empty')} icon="📨" />
        ) : (
          <FlashList
            data={invitations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Text style={[styles.groupName, { color: c.textPrimary }]}>
                  {t('groups.title')} «{item.group.name}»
                </Text>
                <Text style={[styles.from, { color: c.textSecondary }]}>
                  {item.inviter
                    ? formatPhoneForDisplay(item.inviter.phone)
                    : formatPhoneForDisplay(item.invitee_phone)}
                </Text>
                <View style={styles.row}>
                  <Button
                    title={t('invitations.decline')}
                    variant="secondary"
                    onPress={async () => {
                      await invitationsApi.decline(item.id);
                      refresh();
                    }}
                    style={styles.flex}
                  />
                  <Button
                    title={t('invitations.accept')}
                    onPress={async () => {
                      await invitationsApi.accept(item.id);
                      refresh();
                    }}
                    style={styles.flex}
                  />
                </View>
              </Card>
            )}
          />
        )}
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  groupName: { ...typography.titleMedium },
  from: { ...typography.bodyMedium },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
});