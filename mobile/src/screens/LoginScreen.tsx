import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts, fontSizes, spacing } from '../theme/theme';
import { login, resendConfirmation, EmailNotVerifiedError, NotStudentError } from '../api/auth';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'> & {
  onLoggedIn: () => void;
};

export default function LoginScreen({ navigation, onLoggedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setShowResend(false);
    setResendMessage(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      onLoggedIn();
    } catch (err) {
      if (err instanceof EmailNotVerifiedError) {
        setError(err.message);
        setShowResend(true);
      } else if (err instanceof NotStudentError) {
        setError(err.message);
      } else {
        setError('E-mail ou senha inválidos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage(null);
    try {
      const { message } = await resendConfirmation(email.trim());
      setResendMessage(message);
    } catch {
      setResendMessage('Não foi possível reenviar agora. Tente novamente em instantes.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.brand}>EduPrep AI</Text>
          <Text style={styles.title}>Entrar</Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="seu@email.com"
              placeholderTextColor={colors.outline}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.outline}
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {showResend && (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator color={colors.academicNavy} />
              ) : (
                <Text style={styles.linkText}>Reenviar e-mail de confirmação</Text>
              )}
            </TouchableOpacity>
          )}
          {!!resendMessage && <Text style={styles.resendMessage}>{resendMessage}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Ainda não tem conta? Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.containerMargin, gap: 16 },
  brand: { fontFamily: fonts.headlineLgMobile, fontSize: fontSizes.labelMd + 8, color: colors.academicNavy, textAlign: 'center', marginBottom: 4 },
  title: { fontFamily: fonts.headlineLg, fontSize: fontSizes.headlineLgMobile, color: colors.academicNavy, textAlign: 'center', marginBottom: 16 },
  field: { gap: 6 },
  label: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.outline, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.bodyMd,
    fontSize: fontSizes.bodyMd,
    color: colors.onSurface,
    backgroundColor: '#fff',
  },
  error: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.error, textAlign: 'center' },
  resendMessage: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.secondary, textAlign: 'center' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.labelMd, color: colors.secondary, textAlign: 'center' },
  button: {
    marginTop: 8,
    backgroundColor: colors.academicNavy,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: '#fff' },
});
