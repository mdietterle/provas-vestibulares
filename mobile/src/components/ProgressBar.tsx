import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/theme';

interface Props {
  pct: number;
  dim?: boolean;
}

export default function ProgressBar({ pct, dim }: Props) {
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: `${Math.max(0, Math.min(100, pct))}%` },
          dim && { backgroundColor: `${colors.academicNavy}99` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.academicNavy,
  },
});
