import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../core/navigation/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Button } from '../../shared/ui/Button';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Input } from '../../shared/ui/Input';
import { authApi } from '../../shared/api/auth';
import { maskPhoneInput, normalizePhone, isValidPhone, formatPhoneForDisplay } from '../../shared/lib/phone';
import { ApiError } from '../../shared/api/client';
import { useAuthStore } from '../auth/store';
import { deviceStorage } from '../../shared/storage/storage';
import { getMyPhoneNumber } from '../../shared/lib/devicePhone';

type Props = NativeStackScreenProps<AuthStackParamList, 'Phone'>;

export function PhoneScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const setRegistrationToken = useAuthStore((s) => s.setRegistrationToken);

  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const masked = maskPhoneInput(raw);
  const digits = masked.replace(/\D/g, '');
  const valid = isValidPhone(`+${digits}`);

  const submit = () => {
    const e164 = normalizePhone(`+${digits}`);
    // Первый шаг регистрации по ТЗ: пользователь подтверждает введённый номер.
    Alert.alert(t('auth.phone.confirmTitle'), formatPhoneForDisplay(e164), [
      { text: t('auth.phone.edit'), style: 'cancel' },
      { text: t('common.continue'), onPress: () => runSubmit(e164) },
    ]);
  };

  const runSubmit = async (e164: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.registerPhone(e164);
      if (res.exists) {
        const login = await authApi.login(e164, deviceStorage.getDeviceId());
        useAuthStore.getState().setTokens(login);
        useAuthStore.getState().setUser(login.user);
      } else {
        setRegistrationToken(res.registration_token);
        navigation.navigate('Email');
      }
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const fillMyNumber = async () => {
    setAutofilling(true);
    setError(null);
    try {
      const number = await getMyPhoneNumber({
        title: t('auth.phone.useMyNumberPermissionTitle'),
        message: t('auth.phone.useMyNumberPermissionMessage'),
        buttonPositive: t('common.allow'),
        buttonNegative: t('common.cancel'),
      });
      if (number) {
        setRaw(number);
      } else {
        setError(t('auth.phone.useMyNumberUnavailable'));
      }
    } finally {
      setAutofilling(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ScreenContent style={styles.content}>
            <Text style={[styles.title, { color: c.textPrimary }]}>{t('auth.phone.title')}</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              {t('auth.phone.subtitle')}
            </Text>

            <Input
              value={masked}
              onChangeText={(v) => setRaw(v)}
              placeholder={t('auth.phone.placeholder')}
              keyboardType="phone-pad"
              autoFocus
              style={styles.phoneInput}
            />

            <Button
              title={t('auth.phone.useMyNumber')}
              variant="ghost"
              loading={autofilling}
              onPress={fillMyNumber}
            />

            {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

            <Button
              title={t('common.continue')}
              onPress={submit}
              loading={loading}
              disabled={!valid}
              style={styles.continue}
            />
          </ScreenContent>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { justifyContent: 'center' },
  title: { ...typography.titleLarge, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMedium, marginBottom: spacing.xxl },
  phoneInput: { fontSize: 22, textAlign: 'center', letterSpacing: 1 },
  continue: { marginTop: spacing.lg },
  error: { ...typography.bodyMedium, marginTop: spacing.lg, textAlign: 'center' },
});