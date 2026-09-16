import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes } from '../theme/theme';

interface Props {
  label: string;
  tone: 'success' | 'progress' | 'neutral' | 'error';
}

const TONES: Record<Props['tone'], { bg: string; fg: string }> = {
  success: { bg: `${colors.success}26`, fg: '#2f7a00' },
  progress: { bg: `${colors.secondary}26`, fg: colors.onSecondaryContainer },
  neutral: { bg: colors.surfaceContainer, fg: colors.onSurfaceVariant },
  error: { bg: colors.errorContainer, fg: colors.error },
};

export default function StatusBadge({ label, tone }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, textTransform: 'uppercase' },
});
