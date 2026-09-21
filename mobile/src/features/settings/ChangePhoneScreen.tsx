import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CodeField,
  Cursor,
} from 'react-native-confirmation-code-field';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../core/navigation/types';
import { useTheme, spacing, typography } from '../../shared/design-system';
import { Screen, ScreenContent } from '../../shared/ui/Screen';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { authApi } from '../../shared/api/auth';
import { maskPhoneInput, normalizePhone, isValidPhone } from '../../shared/lib/phone';
import { ApiError } from '../../shared/api/client';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ChangePhone'>;

export function ChangePhoneScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [raw, setRaw] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const masked = maskPhoneInput(raw);
  const digits = masked.replace(/\D/g, '');
  const valid = isValidPhone(`+${digits}`);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.changePhoneStart(normalizePhone(`+${digits}`));
      setChallengeId(res.challenge_id);
      setMaskedEmail(res.masked_email);
      setStep('code');
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (value: string) => {
    if (!challengeId || value.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.changePhoneConfirm(challengeId, value);
      navigation.goBack();
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(t('common.error'));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenContent style={{ justifyContent: 'center' }}>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('settings.changePhoneTitle')}</Text>

        {step === 'phone' ? (
          <>
            <Input
              value={masked}
              onChangeText={setRaw}
              placeholder={t('settings.newPhone')}
              keyboardType="phone-pad"
              error={error ?? undefined}
            />
            <Button
              title={t('common.continue')}
              onPress={start}
              loading={loading}
              disabled={!valid}
            />
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              {t('auth.code.sentTo')} {maskedEmail}
            </Text>
            <CodeField
              value={code}
              onChangeText={(v) => {
                setCode(v);
                setError(null);
                if (v.length === 6) confirm(v);
              }}
              cellCount={6}
              rootStyle={styles.codeRoot}
              keyboardType="number-pad"
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
          </>
        )}
      </ScreenContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleLarge, marginBottom: spacing.xl },
  subtitle: { ...typography.bodyMedium, marginBottom: spacing.xl },
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
  error: { ...typography.bodyMedium, textAlign: 'center' },
});