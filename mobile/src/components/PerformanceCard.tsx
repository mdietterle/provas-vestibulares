import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius } from '../theme/theme';

// Equivalente ao ".performance-card" do design Stitch (surface elevada com borda sutil).
export default function PerformanceCard({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    shadowColor: colors.academicNavy,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
