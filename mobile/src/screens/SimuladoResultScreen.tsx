import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PerformanceCard from '../components/PerformanceCard';
import StatusBadge from '../components/StatusBadge';
import { colors, fonts, fontSizes, spacing } from '../theme/theme';
import { fetchSimuladoResult, SimuladoDetail } from '../api/simulados';
import type { SimuladosStackParamList } from '../navigation/SimuladosStack';

type Props = NativeStackScreenProps<SimuladosStackParamList, 'SimuladoResult'>;

export default function SimuladoResultScreen({ route, navigation }: Props) {
  const { simuladoId } = route.params;
  const [simulado, setSimulado] = useState<SimuladoDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      try {
        const data = await fetchSimuladoResult(simuladoId);
        if (cancelled) return;
        setSimulado(data);
        if (data.status === 'done' && interval) clearInterval(interval);
      } catch {}
    };

    load();
    interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [simuladoId]);

  if (!simulado) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={colors.academicNavy} size="large" />
      </SafeAreaView>
    );
  }

  const isCorrecting = simulado.status === 'correcting';
  const total = simulado.questions.length;
  const correct = simulado.questions.filter((q) => q.is_correct).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {isCorrecting ? (
          <PerformanceCard style={styles.correctingCard}>
            <ActivityIndicator color={colors.academicNavy} />
            <Text style={styles.correctingText}>Corrigindo suas respostas...</Text>
          </PerformanceCard>
        ) : (
          <>
            <PerformanceCard style={styles.scoreCard}>
              <Text style={styles.scoreValue}>{simulado.total_score?.toFixed(1)}%</Text>
              <Text style={styles.scoreLabel}>{correct} de {total} questões corretas</Text>
            </PerformanceCard>

            {simulado.enem_estimated_score != null && (
              <PerformanceCard style={styles.enemCard}>
                <View style={styles.enemHeader}>
                  <Text style={styles.enemLabel}>ESTIMATIVA NO ENEM</Text>
                  <Text style={styles.enemDisclaimer}>não é a nota oficial da TRI</Text>
                </View>
                <Text style={styles.enemValue}>{simulado.enem_estimated_score.toFixed(0)} pontos</Text>
                {simulado.enem_score_breakdown && (
                  <View style={styles.enemAreas}>
                    {Object.entries(simulado.enem_score_breakdown.by_area).map(([area, s]) => (
                      <View key={area} style={styles.enemAreaRow}>
                        <Text style={styles.enemAreaName}>{area}</Text>
                        <Text style={styles.enemAreaScore}>
                          {s.score.toFixed(0)} <Text style={styles.enemAreaCount}>({s.correct}/{s.total})</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </PerformanceCard>
            )}

            <View style={styles.list}>
              {simulado.questions.map((q, i) => {
                const correctOpt = q.options.find((o) => o.is_correct);
                return (
                  <PerformanceCard key={q.id} style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <Text style={styles.questionIndex}>Questão {i + 1}</Text>
                      <StatusBadge label={q.is_correct ? 'Correto' : 'Errado'} tone={q.is_correct ? 'success' : 'error'} />
                    </View>
                    {!q.is_correct && correctOpt && (
                      <Text style={styles.correctAnswer}>
                        Resposta correta: {correctOpt.letter}) {correctOpt.text}
                      </Text>
                    )}
                  </PerformanceCard>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {!isCorrecting && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.popToTop()}>
            <Text style={styles.backButtonText}>Voltar aos simulados</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.containerMargin, paddingBottom: 32, gap: 16 },

  correctingCard: { padding: 32, alignItems: 'center', gap: 12 },
  correctingText: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurfaceVariant },

  scoreCard: { padding: 24, alignItems: 'center', gap: 4 },
  scoreValue: { fontFamily: fonts.headlineLg, fontSize: fontSizes.headlineLgMobile, color: colors.academicNavy },
  scoreLabel: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurfaceVariant },

  enemCard: { padding: 20, gap: 10 },
  enemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  enemLabel: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.outline, letterSpacing: 0.5 },
  enemDisclaimer: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm - 1, color: colors.outline },
  enemValue: { fontFamily: fonts.headlineLg, fontSize: fontSizes.headlineLgMobile, color: colors.academicNavy },
  enemAreas: { gap: 6, marginTop: 4 },
  enemAreaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  enemAreaName: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurfaceVariant },
  enemAreaScore: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.onSurface },
  enemAreaCount: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelSm, color: colors.outline },

  list: { gap: 12 },
  questionCard: { padding: 16, gap: 8 },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionIndex: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.onSurface },
  correctAnswer: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.onSurfaceVariant },

  footer: { padding: spacing.containerMargin, paddingTop: 12 },
  backButton: {
    backgroundColor: colors.academicNavy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: '#fff' },
});
