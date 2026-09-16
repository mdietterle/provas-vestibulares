import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import PerformanceCard from '../components/PerformanceCard';
import { colors, fonts, fontSizes, spacing } from '../theme/theme';
import { getSimulado, submitSimulado, SimuladoDetail } from '../api/simulados';
import type { SimuladosStackParamList } from '../navigation/SimuladosStack';

const bannerAdUnitId =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS || TestIds.ADAPTIVE_BANNER
    : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || TestIds.ADAPTIVE_BANNER;

type Props = NativeStackScreenProps<SimuladosStackParamList, 'SimuladoQuestion'>;

export default function SimuladoQuestionScreen({ route, navigation }: Props) {
  const { simuladoId } = route.params;
  const [simulado, setSimulado] = useState<SimuladoDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSimulado(simuladoId)
      .then((data) => {
        setSimulado(data);
        const preAnswers: Record<number, string> = {};
        data.questions.forEach((q) => {
          if (q.selected_letter) preAnswers[q.id] = q.selected_letter;
        });
        setAnswers(preAnswers);
      })
      .catch(() => setError('Não foi possível carregar o simulado.'))
      .finally(() => setLoading(false));
  }, [simuladoId]);

  const handleSelect = (questionId: number, letter: string) => {
    setAnswers((a) => ({ ...a, [questionId]: letter }));
  };

  const handleSubmit = useCallback(
    async (allAnswers: Record<number, string>) => {
      if (!simulado) return;
      setSubmitting(true);
      try {
        await submitSimulado(
          simulado.id,
          simulado.questions.map((q) => ({ simulado_question_id: q.id, selected_letter: allAnswers[q.id] })),
        );
        navigation.replace('SimuladoResult', { simuladoId: simulado.id });
      } catch {
        setError('Não foi possível enviar o simulado agora.');
        setSubmitting(false);
      }
    },
    [simulado, navigation],
  );

  const handleNext = () => {
    if (!simulado) return;
    const current = simulado.questions[currentIndex];
    if (!answers[current.id]) return;

    const isLast = currentIndex === simulado.questions.length - 1;
    if (isLast) {
      handleSubmit(answers);
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={colors.academicNavy} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !simulado) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Text style={styles.errorText}>{error || 'Simulado não encontrado.'}</Text>
      </SafeAreaView>
    );
  }

  const total = simulado.questions.length;
  const question = simulado.questions[currentIndex];
  const isAnswered = !!answers[question.id];
  const isLast = currentIndex === total - 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.progress}>Questão {currentIndex + 1} de {total}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentIndex + 1) / total) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <PerformanceCard style={styles.questionCard}>
          {question.area && <Text style={styles.area}>{question.area}</Text>}
          <Text style={styles.statement}>{question.statement.replace(/<[^>]+>/g, '')}</Text>
          {question.image_base64 && (
            <Image source={{ uri: question.image_base64 }} style={styles.image} resizeMode="contain" />
          )}
          <View style={styles.options}>
            {question.options.map((opt) => {
              const selected = answers[question.id] === opt.letter;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => handleSelect(question.id, opt.letter)}
                >
                  <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}>
                    <Text style={[styles.optionLetterText, selected && styles.optionLetterTextSelected]}>
                      {opt.letter}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </PerformanceCard>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, (!isAnswered || submitting) && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!isAnswered || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {!isAnswered ? 'Selecione uma alternativa' : isLast ? 'Enviar simulado' : 'Próxima questão'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.adBanner}>
        <BannerAd key={currentIndex} unitId={bannerAdUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: 24 },
  errorText: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.error, textAlign: 'center' },

  header: { paddingHorizontal: spacing.containerMargin, paddingTop: spacing.base, gap: 8 },
  progress: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.outline },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceContainerHigh, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.academicNavy, borderRadius: 3 },

  content: { padding: spacing.containerMargin, paddingBottom: 32 },
  questionCard: { padding: 20, gap: 16 },
  area: {
    alignSelf: 'flex-start',
    fontFamily: fonts.labelSm,
    fontSize: fontSizes.labelSm,
    color: colors.academicNavy,
    backgroundColor: `${colors.academicNavy}14`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statement: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurface, lineHeight: 22 },
  image: { width: '100%', height: 200, borderRadius: 12 },

  options: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  optionSelected: { borderColor: colors.academicNavy, backgroundColor: `${colors.academicNavy}0d` },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  optionLetterSelected: { backgroundColor: colors.academicNavy },
  optionLetterText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.labelSm, color: colors.onSurfaceVariant },
  optionLetterTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurfaceVariant },
  optionTextSelected: { color: colors.academicNavy, fontFamily: fonts.bodyBold },

  adBanner: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLow },
  footer: { padding: spacing.containerMargin, paddingTop: 12 },
  nextButton: {
    backgroundColor: colors.academicNavy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: '#fff' },
});
