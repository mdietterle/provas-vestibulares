import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fonts, fontSizes, spacing } from '../theme/theme';
import { resendConfirmation } from '../api/auth';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterSuccess'>;

export default function RegisterSuccessScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setResendMessage(null);
    try {
      const { message } = await resendConfirmation(email);
      setResendMessage(message);
    } catch {
      setResendMessage('Não foi possível reenviar agora. Tente novamente em instantes.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <Text style={styles.title}>Verifique seu e-mail</Text>
        <Text style={styles.body}>
          Enviamos um link de confirmação para{'\n'}
          <Text style={styles.email}>{email}</Text>.
        </Text>
        <Text style={styles.hint}>
          Abra o link no seu e-mail (verifique também a caixa de spam) para ativar sua conta e poder fazer login.
        </Text>

        {!!resendMessage && <Text style={styles.resendMessage}>{resendMessage}</Text>}

        <TouchableOpacity style={styles.secondaryButton} onPress={handleResend} disabled={resending}>
          {resending ? (
            <ActivityIndicator color={colors.academicNavy} />
          ) : (
            <Text style={styles.secondaryButtonText}>Reenviar e-mail de confirmação</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
        >
          <Text style={styles.buttonText}>Voltar para o login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.containerMargin, gap: 12 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.success}22`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconText: { fontSize: 28, color: colors.success, fontFamily: fonts.bodyBold },
  title: { fontFamily: fonts.headlineLg, fontSize: fontSizes.headlineLgMobile, color: colors.academicNavy, textAlign: 'center' },
  body: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurface, textAlign: 'center', lineHeight: 22 },
  email: { fontFamily: fonts.bodyBold, color: colors.academicNavy },
  hint: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.outline, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  resendMessage: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.secondary, textAlign: 'center', marginTop: 8 },
  secondaryButton: { marginTop: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.academicNavy },
  button: {
    marginTop: 4,
    backgroundColor: colors.academicNavy,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: '#fff' },
});
