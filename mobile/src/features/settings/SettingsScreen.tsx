import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../core/navigation/types';
import { useMe } from '../auth/queries';
import { useAuthStore } from '../auth/store';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { LoadingState } from '../../shared/ui/LoadingState';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';
import { formatPhoneForDisplay } from '../../shared/lib/phone';
import { ThemeMode } from '../../shared/storage/storage';

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { theme, mode, setMode } = useTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();
  const logout = useAuthStore((s) => s.logout);

  const { data: me, isLoading } = useMe();

  const confirmLogout = () => {
    Alert.alert(t('settings.confirmLogout'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (isLoading) return <LoadingState />;

  return (
    <Screen edges={['top']}>
      <ScreenContent>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('settings.title')}</Text>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('settings.phone')}</Text>
          <Text style={[styles.value, { color: c.textPrimary }]}>
            {me?.phone ? formatPhoneForDisplay(me.phone) : '—'}
          </Text>
          {me?.email ? (
            <>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('settings.email')}</Text>
              <Text style={[styles.value, { color: c.textPrimary }]}>{me.email}</Text>
            </>
          ) : null}
          <Button
            title={t('settings.changePhone')}
            variant="secondary"
            onPress={() => navigation.navigate('ChangePhone')}
            style={styles.change}
          />
        </Card>

        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.appearance')}</Text>
        <SegmentedControl
          options={[
            { value: 'light' as const, label: t('settings.themeLight') },
            { value: 'dark' as const, label: t('settings.themeDark') },
            { value: 'system' as const, label: t('settings.themeSystem') },
          ]}
          value={mode}
          onChange={(m) => setMode(m as ThemeMode)}
        />

        <Button
          title={t('settings.logout')}
          variant="danger"
          onPress={confirmLogout}
          style={styles.logout}
        />
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.lg },
  card: { marginBottom: spacing.lg },
  label: { ...typography.caption, marginBottom: spacing.xs },
  value: { ...typography.bodyLarge, marginBottom: spacing.md },
  change: { marginTop: spacing.sm },
  section: { ...typography.caption, marginBottom: spacing.sm },
  logout: { marginTop: spacing.xxl },
});