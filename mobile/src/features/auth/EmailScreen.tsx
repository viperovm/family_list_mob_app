import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../core/navigation/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Button } from '../../shared/ui/Button';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Input } from '../../shared/ui/Input';
import { authApi } from '../../shared/api/auth';
import { ApiError } from '../../shared/api/client';
import { useAuthStore } from '../auth/store';

type Props = NativeStackScreenProps<AuthStackParamList, 'Email'>;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function EmailScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const registrationToken = useAuthStore((s) => s.registrationToken);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!registrationToken) {
      // Session lost (e.g. app was reloaded) — restart the flow from the phone step.
      navigation.navigate('Phone');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.registerEmail(registrationToken, email.trim());
      navigation.navigate('Code');
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenContent style={{ justifyContent: 'center' }}>
          <Text style={[styles.title, { color: c.textPrimary }]}>{t('auth.email.title')}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {t('auth.email.subtitle')}
          </Text>

          <Input
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.email.placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={error ?? undefined}
          />

          <Button
            title={t('auth.email.getCode')}
            onPress={submit}
            loading={loading}
            disabled={!isValidEmail(email)}
          />
        </ScreenContent>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMedium, marginBottom: spacing.xxl },
});