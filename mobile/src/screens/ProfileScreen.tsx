import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import PerformanceCard from '../components/PerformanceCard';
import { colors, fonts, fontSizes, spacing } from '../theme/theme';
import { fetchMe, updateProfile, uploadAvatar, UserOut } from '../api/students';
import { logout } from '../api/auth';

interface Props {
  onLoggedOut: () => void;
}

const LINKS = [
  { key: 'settings', label: 'Configurações', icon: 'settings' as const },
  { key: 'help', label: 'Central de Ajuda', icon: 'help-outline' as const },
  { key: 'terms', label: 'Termos de Uso', icon: 'description' as const },
];

export default function ProfileScreen({ onLoggedOut }: Props) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  const load = useCallback(() => {
    fetchMe()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para trocar o avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(asset.uri, asset.mimeType ?? 'image/jpeg');
      setUser(updated);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar sua foto agora.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout().then(onLoggedOut) },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={colors.academicNavy} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PerformanceCard style={styles.headerCard}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <MaterialIcons name="person" size={40} color={colors.academicNavy} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="edit" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <TouchableOpacity style={styles.editButton} onPress={() => setEditVisible(true)}>
            <MaterialIcons name="edit" size={16} color={colors.academicNavy} />
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>
        </PerformanceCard>

        <PerformanceCard style={styles.linksCard}>
          {LINKS.map((link, idx) => (
            <TouchableOpacity
              key={link.key}
              style={[styles.linkRow, idx < LINKS.length - 1 && styles.linkRowBorder]}
            >
              <View style={styles.linkLeft}>
                <View style={styles.linkIcon}>
                  <MaterialIcons name={link.icon} size={20} color={colors.academicNavy} />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </TouchableOpacity>
          ))}
        </PerformanceCard>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>EduPrep AI</Text>
      </ScrollView>

      <EditProfileModal
        visible={editVisible}
        user={user}
        onClose={() => setEditVisible(false)}
        onSaved={(updated) => {
          setUser(updated);
          setEditVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

function EditProfileModal({
  visible,
  user,
  onClose,
  onSaved,
}: {
  visible: boolean;
  user: UserOut | null;
  onClose: () => void;
  onSaved: (user: UserOut) => void;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(user?.name ?? '');
      setCurrentPassword('');
      setNewPassword('');
      setError(null);
    }
  }, [visible, user]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim() || undefined,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });
      onSaved(updated);
    } catch {
      setError('Não foi possível salvar. Confira sua senha atual e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.academicNavy} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Editar Perfil</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.label}>Nome</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.outline} />

          <Text style={styles.label}>Senha atual (para trocar a senha)</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Deixe em branco para não alterar"
            placeholderTextColor={colors.outline}
          />

          <Text style={styles.label}>Nova senha</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Deixe em branco para não alterar"
            placeholderTextColor={colors.outline}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.submitButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Salvar</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.containerMargin, paddingBottom: 120, gap: 20 },

  headerCard: { padding: 24, alignItems: 'center', gap: 4 },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLow },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: { fontFamily: fonts.titleMdExtra, fontSize: fontSizes.titleMd, color: colors.onSurface },
  email: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.onSurfaceVariant },
  editButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  editButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.labelMd, color: colors.academicNavy },

  linksCard: { paddingVertical: 4 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceContainerHigh },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.onSurface },

  logoutButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.error}33`,
  },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: colors.error },

  footer: { textAlign: 'center', fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.outline, opacity: 0.6, marginTop: 12 },

  modalScreen: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.containerMargin,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  modalTitle: { fontFamily: fonts.titleMd, fontSize: fontSizes.titleMd, color: colors.academicNavy },
  modalContent: { padding: spacing.containerMargin, gap: 12 },
  label: { fontFamily: fonts.labelSm, fontSize: fontSizes.labelSm, color: colors.outline, textTransform: 'uppercase', marginTop: 8 },
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
  errorText: { fontFamily: fonts.bodyMd, fontSize: fontSizes.labelMd, color: colors.error },
  submitButton: {
    marginTop: 16,
    backgroundColor: colors.academicNavy,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyMd, color: '#fff' },
});
