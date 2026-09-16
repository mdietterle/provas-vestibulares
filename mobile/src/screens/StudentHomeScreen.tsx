import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import TopAppBar from '../components/TopAppBar';
import PerformanceCard from '../components/PerformanceCard';
import ProgressBar from '../components/ProgressBar';
import { colors, fonts, fontSizes, spacing } from '../theme/theme';
import { fetchMe, fetchStudentDashboard, StudentDashboard, UserOut } from '../api/students';
import { logout } from '../api/auth';

interface Props {
  onLoggedOut: () => void;
  navigation: { navigate: (route: string) => void };
}

export default function StudentHomeScreen({ onLoggedOut, navigation }: Props) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [me, dash] = await Promise.all([fetchMe(), fetchStudentDashboard()]);
      setUser(me);
      setDashboard(dash);
    } catch {
      setError('Não foi possível carregar seu desempenho agora.');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={colors.academicNavy} size="large" />
      </SafeAreaView>
    );
  }

  const areaEntries = Object.entries(dashboard?.by_area ?? {});

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

        {/* Page Header */}
        <View>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DASHBOARD TÉCNICO</Text>
            </View>
          </View>
          <View style={styles.headlineRow}>
            <Text style={styles.headline}>Relatório de Desempenho</Text>
            <TouchableOpacity onPress={() => logout().then(onLoggedOut)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="logout" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          {!!user && (
            <Text style={styles.subtitle}>
              Análise de progresso para <Text style={styles.subtitleStrong}>{user.name}</Text>
            </Text>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryButton}>
              <MaterialIcons name="file-download" size={18} color={colors.academicNavy} />
              <Text style={styles.secondaryButtonText}>Exportar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Simulados')}>
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Novo Simulado</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumo Global */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Global</Text>
          <View style={styles.summaryGrid}>
            <SummaryStat label="Média Geral" value={dashboard?.average_score?.toFixed(0) ?? '—'} />
            <SummaryStat
              label="Simulados Feitos"
              value={String(dashboard?.completed_simulados ?? 0)}
              suffix={`de ${dashboard?.total_simulados ?? 0}`}
            />
            <SummaryStat label="Melhor Nota" value={dashboard?.best_score?.toFixed(0) ?? '—'} />
            <SummaryStat label="Nesta Semana" value={String(dashboard?.simulados_this_week ?? 0)} suffix="simulados" />
          </View>
        </View>

        {/* Performance por área */}
        <PerformanceCard style={styles.section}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitleInCard}>Performance por Área</Text>
          </View>
          <View style={styles.cardBody}>
            {areaEntries.length === 0 && (
              <Text style={styles.emptyText}>Ainda não há questões respondidas para calcular seu desempenho por área.</Text>
            )}
            {areaEntries.map(([area, stats]) => (
              <View key={area} style={styles.areaRow}>
                <View style={styles.areaHeaderRow}>
                  <Text style={styles.areaName}>{area}</Text>
                  <Text style={styles.areaPct}>{stats.pct}%</Text>
                </View>
                <ProgressBar pct={stats.pct} dim={stats.pct < 65} />
              </View>
            ))}
          </View>
        </PerformanceCard>

        {/* Simulados recentes */}
        <PerformanceCard style={[styles.section, styles.cardBody]}>
          <Text style={styles.sectionTitleInCard}>Simulados Recentes</Text>
          <View style={{ marginTop: 16, gap: 16 }}>
            {(dashboard?.recent_simulados ?? []).length === 0 && (
              <Text style={styles.emptyText}>Você ainda não fez nenhum simulado.</Text>
            )}
            {(dashboard?.recent_simulados ?? []).slice(0, 5).map((s) => (
              <View key={s.id} style={styles.milestoneRow}>
                <View style={styles.milestoneLeft}>
                  <View style={styles.milestoneIcon}>
                    <MaterialIcons name="event" size={20} color={colors.academicNavy} />
                  </View>
                  <View>
                    <Text style={styles.milestoneTitle}>{s.exam_type}</Text>
                    <Text style={styles.milestoneSubtitle}>
                      {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
                <View style={styles.milestoneBadge}>
                  <Text style={styles.milestoneBadgeText}>
                    {s.status === 'done' ? (s.total_score?.toFixed(0) ?? '—') : 'EM ANDAMENTO'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </PerformanceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <PerformanceCard style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {!!suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
      </View>
    </PerformanceCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.containerMargin, paddingBottom: 120, gap: 32 },

  errorCard: { padding: 16, backgroundColor: colors.errorContainer, borderColor: colors.error },
  errorText: { fontFamily: fonts.bodyMd, color: colors.error },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: `${colors.academicNavy}1A`,
  },
  badgeText: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.academicNavy, letterSpacing: 0.5 },

  headlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headline: { flex: 1, fontFamily: fonts.headlineLg, fontSize: fontSizes.headlineLgMobile, color: colors.academicNavy, lineHeight: 34 },
  subtitle: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  subtitleStrong: { fontFamily: fonts.bodyBold, color: colors.academicNavy },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: '#fff',
  },
  secondaryButtonText: { fontFamily: fonts.bodyBold, color: colors.academicNavy, fontSize: fontSizes.bodyMd },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.academicNavy,
  },
  primaryButtonText: { fontFamily: fonts.bodyBold, color: '#fff', fontSize: fontSizes.bodyMd },

  section: { gap: 16 },
  sectionTitle: { fontFamily: fonts.titleMd, fontSize: fontSizes.titleMd, color: colors.academicNavy },
  sectionTitleInCard: { fontFamily: fonts.titleMd, fontSize: fontSizes.titleMd, color: colors.academicNavy },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { width: '47%', padding: 16 },
  statLabel: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.outline, textTransform: 'uppercase', marginBottom: 8 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statValue: { fontFamily: fonts.titleMdExtra, fontSize: 28, color: colors.academicNavy },
  statSuffix: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.onSurfaceVariant },

  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  cardBody: { padding: 20, gap: 20 },
  emptyText: { fontFamily: fonts.bodyMd, fontSize: fontSizes.bodyMd, color: colors.onSurfaceVariant },

  areaRow: { gap: 8 },
  areaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  areaName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.onSurface },
  areaPct: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.academicNavy },

  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  milestoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.onSurface },
  milestoneSubtitle: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.onSurfaceVariant },
  milestoneBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4D`,
  },
  milestoneBadgeText: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.outline },
});
