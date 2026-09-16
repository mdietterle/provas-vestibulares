import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing } from '../theme/theme';

interface Props {
  avatarUrl?: string | null;
  onPressNotifications?: () => void;
}

export default function TopAppBar({ avatarUrl, onPressNotifications }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <MaterialIcons name="person" size={22} color={colors.academicNavy} />
            </View>
          )}
        </View>
        <Text style={styles.title}>EduPrep AI</Text>
      </View>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={onPressNotifications}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="notifications" size={22} color={colors.academicNavy} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.base,
    backgroundColor: colors.surface,
    shadowColor: colors.academicNavy,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primaryFixedDim,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLow },
  title: {
    fontFamily: fonts.headlineLgMobile,
    fontSize: fontSizes.labelMd + 8,
    color: colors.academicNavy,
  },
  bellButton: { padding: 8, borderRadius: 999 },
});
