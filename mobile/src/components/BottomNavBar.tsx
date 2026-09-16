import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../theme/theme';

type IconName = keyof typeof MaterialIcons.glyphMap;

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'simulados', label: 'Simulados', icon: 'quiz' },
  { key: 'perfil', label: 'Perfil', icon: 'person' },
];

interface Props {
  active: string;
  onSelect: (key: string) => void;
}

export default function BottomNavBar({ active, onSelect }: Props) {
  return (
    <View style={styles.nav}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(tab.key)}
          >
            <MaterialIcons
              name={tab.icon}
              size={22}
              color={isActive ? colors.onSecondaryContainer : colors.onSurfaceVariant}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    shadowColor: colors.academicNavy,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabActive: { backgroundColor: colors.secondaryContainer },
  label: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  labelActive: { color: colors.onSecondaryContainer },
});
