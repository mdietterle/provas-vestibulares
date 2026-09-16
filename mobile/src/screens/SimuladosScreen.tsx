import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TopAppBar from '../components/TopAppBar';
import PerformanceCard from '../components/PerformanceCard';
import StatusBadge from '../components/StatusBadge';
import { colors, fonts, fontSizes, spacing } from '../theme/theme';
import {
  createSimulado,
  EXAM_TYPE_LABELS,
  ExamType,
  fetchSimulados,
  fetchTodaySimuladoStatus,
  SimuladoListItem,
} from '../api/simulados';
import { fetchMe, UserOut } from '../api/students';
import type { SimuladosStackParamList } from '../navigation/SimuladosStack';

const EXAM_TYPES: ExamType[] = ['enem', 'acafe', 'ufpr', 'ufsc'];

const STATUS_LABEL: Record<SimuladoListItem['status'], string> = {
  pending: 'Em andamento',
  correcting: 'Corrigindo',
  done: 'Concluído',
};

type Props = NativeStackScreenProps<SimuladosStackParamList, 'SimuladosList'>;

export default function SimuladosScreen({ navigation }: Props) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [simulados, setSimulados] = useState<SimuladoListItem[]>([]);
  const [canCreateToday, setCanCreateToday] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examTypeModalVisible, setExamTypeModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [me, list, today] = await Promise.all([fetchMe(), fetchSimulados(), fetchTodaySimuladoStatus()]);
      setUser(me);
      setSimulados(list);
      setCanCreateToday(!today.has_simulado);
    } catch {
      setError('Não foi possível carregar seus simulados agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleCreate = (examType: ExamType) => {
    if (creating) return;
    setExamTypeModalVisible(false);
    setCreating(true);
    setError(null);
    createSimulado(examType)
      .then((detail) => navigation.navigate('SimuladoQuestion', { simuladoId: detail.id }))
      .catch((err) => {
        setError(
          err?.response?.status === 429
            ? 'Você já iniciou um simulado hoje. Volte amanhã para criar outro.'
            : 'Não foi possível criar o simulado agora.',
        );
      })
      .finally(() => setCreating(false));
  };

  const confirmCreate = () => setExamTypeModalVisible(true);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={colors.academicNavy} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <TopAppBar avatarUrl={user?.avatar} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.academicNavy} />}
      >
        {error && (
          <PerformanceCard style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </PerformanceCard>
        )}

        <View>
          <Text style={styles.headline}>Meus Simulados</Text>
          <Text style={styles.subtitle}>Acompanhe seu histórico e inicie novas provas.</Text>

          <TouchableOpacity
            style={[styles.createButton, (!canCreateToday || creating) && styles.createButtonDisabled]}
            onPress={confirmCreate}
            disabled={!canCreateToday || creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.createButtonText}>
                  {canCreateToday ? 'Novo Simulado' : 'Limite diário atingido'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          {simulados.length === 0 && (
            <PerformanceCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>Você ainda não fez nenhum simulado.</Text>
            </PerformanceCard>
          )}
          {simulados.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() =>
                navigation.navigate(
                  s.status === 'pending' ? 'SimuladoQuestion' : 'SimuladoResult',
                  { simuladoId: s.id },
                )
              }
            >
              <PerformanceCard style={styles.simuladoCard}>
                <View style={styles.simuladoHeader}>
                  <Text style={styles.simuladoTitle}>{EXAM_TYPE_LABELS[s.exam_type]}</Text>
                  <StatusBadge
                    label={STATUS_LABEL[s.status]}
                    tone={s.status === 'done' ? 'success' : 'progress'}
                  />
                </View>
                <Text style={styles.simuladoMeta}>
                  {s.question_count} questões · {new Date(s.created_at).toLocaleDateString('pt-BR')}
                </Text>
                {s.areas.length > 0 && <Text style={styles.simuladoAreas}>{s.areas.join(' · ')}</Text>}
                {s.status === 'done' && s.total_score != null && (
                  <Text style={styles.simuladoScore}>Nota: {s.total_score.toFixed(0)}</Text>
                )}
              </PerformanceCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={examTypeModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setExamTypeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setExamTypeModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Escolha o tipo de prova</Text>
            {EXAM_TYPES.map((type) => (
              <TouchableOpacity key={type} style={styles.modalOption} onPress={() => handleCreate(type)}>
                <Text style={styles.modalOptionText}>{EXAM_TYPE_LABELS[type]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setExamTypeModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.containerMargin, paddingBottom: 120, gap: 32 },

  errorCard: { padding: 16, backgroundColor: colors.errorContainer, borderColor: colors.error },
  errorText: { fontFamily: fonts.bodyMd, color: colors.error },

  headline: { fontFamily: fonts.headlineLg, fontSize: fontSizes.headlineLgMobile, color: colors.academicNavy },
  subtitle: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 20 },

  createButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  createButtonDisabled: { opacity: 0.5 },
  createButtonText: { fontFamily: fonts.titleMd, fontSize: fontSizes.titleMd, color: '#fff' },

  section: { gap: 12 },
  sectionTitle: { fontFamily: fonts.titleMd, fontSize: fontSizes.titleMd, color: colors.academicNavy },

  emptyCard: { padding: 20 },
  emptyText: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurfaceVariant },

  simuladoCard: { padding: 16, gap: 6 },
  simuladoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  simuladoTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.onSurface },
  simuladoMeta: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.outline },
  simuladoAreas: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.onSurfaceVariant },
  simuladoScore: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.academicNavy, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.containerMargin,
    paddingBottom: 32,
    gap: 8,
  },
  modalTitle: {
    fontFamily: fonts.titleMd,
    fontSize: fontSizes.titleMd,
    color: colors.academicNavy,
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  modalOptionText: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurface },
  modalCancel: { paddingVertical: 14, marginTop: 4, alignItems: 'center' },
  modalCancelText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.error },
});
