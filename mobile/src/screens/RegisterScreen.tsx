import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fonts, fontSizes, spacing } from '../theme/theme';
import { register } from '../api/auth';
import { searchInstitutions, InstitutionOption } from '../api/institutions';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [institutionQuery, setInstitutionQuery] = useState('');
  const [institutionOptions, setInstitutionOptions] = useState<InstitutionOption[]>([]);
  // Instituição existente (selecionada na busca) ou nova (nome digitado que não foi encontrado)
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionOption | { id: null; name: string } | null>(null);
  const [searching, setSearching] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedInstitution || institutionQuery.trim().length < 2) {
      setInstitutionOptions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchInstitutions(institutionQuery.trim())
        .then((results) => {
          if (!cancelled) setInstitutionOptions(results);
        })
        .catch(() => {
          if (!cancelled) setInstitutionOptions([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [institutionQuery, selectedInstitution]);

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (!selectedInstitution) {
      setError('Selecione sua instituição.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const institution = selectedInstitution.id
        ? { id: selectedInstitution.id }
        : { name: selectedInstitution.name };
      await register(name.trim(), email.trim(), password, institution);
      navigation.replace('RegisterSuccess', { email: email.trim() });
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Não foi possível concluir o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>EduPrep AI</Text>
          <Text style={styles.title}>Criar conta</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.outline}
            />
          </View>

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
            <Text style={styles.label}>Instituição</Text>
            {selectedInstitution ? (
              <View style={styles.selectedInstitution}>
                <View style={styles.selectedInstitutionTextWrap}>
                  <Text style={styles.selectedInstitutionText}>{selectedInstitution.name}</Text>
                  {!selectedInstitution.id && <Text style={styles.newInstitutionTag}>Nova instituição</Text>}
                </View>
                <TouchableOpacity onPress={() => { setSelectedInstitution(null); setInstitutionQuery(''); }}>
                  <Text style={styles.changeLink}>Trocar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={institutionQuery}
                  onChangeText={setInstitutionQuery}
                  placeholder="Busque pelo nome da sua escola"
                  placeholderTextColor={colors.outline}
                />
                {searching && <ActivityIndicator style={styles.inlineLoader} color={colors.academicNavy} />}
                {institutionOptions.length > 0 && (
                  <View style={styles.optionsList}>
                    {institutionOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        style={styles.optionItem}
                        onPress={() => { setSelectedInstitution(opt); setInstitutionOptions([]); }}
                      >
                        <Text style={styles.optionText}>{opt.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {!searching && institutionQuery.trim().length >= 2 && institutionOptions.length === 0 && (
                  <View>
                    <Text style={styles.hint}>Nenhuma instituição encontrada.</Text>
                    <TouchableOpacity
                      style={styles.newInstitutionButton}
                      onPress={() => setSelectedInstitution({ id: null, name: institutionQuery.trim() })}
                    >
                      <Text style={styles.newInstitutionButtonText}>
                        Cadastrar "{institutionQuery.trim()}" como nova instituição
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.outline}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Repita a senha"
              placeholderTextColor={colors.outline}
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar conta</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Já tem conta? Fazer login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.containerMargin, paddingVertical: 32, gap: 16 },
  brand: { fontFamily: fonts.headlineLgMobile, fontSize: fontSizes.labelMd + 8, color: colors.academicNavy, textAlign: 'center', marginBottom: 4 },
  title: { fontFamily: fonts.headlineLg, fontSize: fontSizes.headlineLgMobile, color: colors.academicNavy, textAlign: 'center', marginBottom: 8 },
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
  inlineLoader: { marginTop: 6 },
  optionsList: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  optionItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  optionText: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurface },
  hint: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.outline },
  newInstitutionButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  newInstitutionButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.labelMd, color: colors.secondary, textAlign: 'center' },
  newInstitutionTag: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.secondary, marginTop: 2 },
  selectedInstitution: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.academicNavy,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: `${colors.academicNavy}0d`,
  },
  selectedInstitutionTextWrap: { flex: 1 },
  selectedInstitutionText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.academicNavy },
  changeLink: { fontFamily: fonts.bodyBold, fontSize: fontSizes.labelMd, color: colors.secondary },
  error: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.error, textAlign: 'center' },
  button: {
    marginTop: 8,
    backgroundColor: colors.academicNavy,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: '#fff' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.labelMd, color: colors.secondary },
});
