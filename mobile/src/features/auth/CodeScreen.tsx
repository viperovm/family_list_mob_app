import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CodeField, Cursor } from 'react-native-confirmation-code-field';
import type { AuthStackParamList } from '../../core/navigation/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { authApi } from '../../shared/api/auth';
import { ApiError } from '../../shared/api/client';
import { useAuthStore } from '../auth/store';

type Props = NativeStackScreenProps<AuthStackParamList, 'Code'>;

const CELL_COUNT = 6;
const RESEND_SECONDS = 58;

export function CodeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const registrationToken = useAuthStore((s) => s.registrationToken);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const timersRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const submit = async (value: string) => {
    if (!registrationToken) {
      navigation.navigate('Phone');
      return;
    }
    if (value.length !== CELL_COUNT) return;
    setLoading(true);
    setError(null);
    try {
      const auth = await authApi.registerVerify(registrationToken, value);
      setTokens(auth);
      setUser(auth.user);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(t('common.error'));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    timersRef.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          if (timersRef.current) clearInterval(timersRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timersRef.current) clearInterval(timersRef.current);
    };
  }, [resendIn > 0]);

  const resend = async () => {
    // Re-send email code: restart from email step (backend needs registration_token + email).
    navigation.navigate('Email');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenContent style={{ justifyContent: 'center' }}>
          <Text style={[styles.title, { color: c.textPrimary }]}>{t('auth.code.title')}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {t('auth.code.sentTo')}
          </Text>

          <CodeField
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setError(null);
              if (v.length === CELL_COUNT) submit(v);
            }}
            cellCount={CELL_COUNT}
            rootStyle={styles.codeRoot}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoFocus
            renderCell={({ index, symbol, isFocused }) => (
              <Text
                key={index}
                style={[
                  styles.cell,
                  {
                    backgroundColor: c.surface,
                    borderColor: isFocused ? c.primary : c.border,
                    color: c.textPrimary,
                  },
                ]}
              >
                {symbol || (isFocused ? <Cursor /> : null)}
              </Text>
            )}
          />

          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

          <Text style={[styles.resend, { color: c.textSecondary }]}>
            {resendIn > 0
              ? `${t('auth.code.resendIn')} 0:${resendIn.toString().padStart(2, '0')}`
              : t('auth.code.resend')}
          </Text>
          <Text
            style={[styles.changeEmail, { color: c.primary }]}
            onPress={() => navigation.navigate('Email')}
          >
            {t('auth.code.changeEmail')}
          </Text>
        </ScreenContent>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMedium, marginBottom: spacing.xxl },
  codeRoot: { marginBottom: spacing.xl },
  cell: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 56,
  },
  error: { ...typography.bodyMedium, marginBottom: spacing.lg, textAlign: 'center' },
  resend: { ...typography.bodyMedium, textAlign: 'center', marginBottom: spacing.md },
  changeEmail: { ...typography.bodyMedium, textAlign: 'center', textDecorationLine: 'underline' },
});