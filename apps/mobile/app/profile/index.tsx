import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../../src/state/authStore';
import { supabase } from '../../src/supabase/client';
import { pickAndUploadAvatar, signedAvatarUrl, updateDisplayName } from '../../src/supabase/profile';
import { colors, fonts } from '../../src/theme/tokens';
import { AppButton } from '../../src/ui/AppButton';
import { displayNameFromUser } from '../../src/ui/format';
import { ChevLeft, ChevRight, EditIcon, SignOutIcon, TickIcon } from '../../src/ui/Icons';

type Row = { label: string; sub: string; href: string };

const SECTIONS: { group: string; items: Row[] }[] = [
  {
    group: 'Account',
    items: [
      { label: 'Notifications', sub: 'Manage alerts', href: '/profile/notifications' },
      { label: 'Privacy', sub: 'Data & permissions', href: '/profile/privacy' },
    ],
  },
  {
    group: 'Support',
    items: [
      { label: 'Help & Feedback', sub: 'Get in touch', href: '/profile/help' },
      {
        label: 'About Pose Match',
        sub: `Version ${Constants.expoConfig?.version ?? '1.0.0'}`,
        href: '/profile/about',
      },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayNameFromUser(user));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarPath =
    typeof user?.user_metadata?.avatar_path === 'string'
      ? user.user_metadata.avatar_path
      : null;

  useEffect(() => {
    setName(displayNameFromUser(user));
  }, [user]);

  useEffect(() => {
    let alive = true;
    signedAvatarUrl(avatarPath).then((url) => {
      if (alive) setAvatarUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [avatarPath]);

  const saveName = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateDisplayName(name);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update name');
    } finally {
      setBusy(false);
    }
  };

  const changeAvatar = async () => {
    setBusy(true);
    setError(null);
    try {
      await pickAndUploadAvatar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update avatar');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 36 }}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.identity}>
        <Pressable onPress={() => void changeAvatar()} disabled={busy} style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <EditIcon color={colors.bg} size={13} />
          </View>
        </Pressable>

        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.nameInput}
              autoFocus
            />
            <Pressable onPress={() => void saveName()} style={styles.saveNameBtn} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.bg} /> : <TickIcon size={14} />}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)} style={styles.nameBtn}>
            <Text style={styles.name}>{name}</Text>
            <EditIcon />
          </Pressable>
        )}
        <Text style={styles.email}>{user?.email ?? ''}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {SECTIONS.map((section) => (
        <View key={section.group} style={styles.section}>
          <Text style={styles.group}>{section.group}</Text>
          <View style={styles.card}>
            {section.items.map((item, i) => (
              <View key={item.label}>
                <Pressable
                  onPress={() => router.push(item.href)}
                  style={styles.row}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowSub}>{item.sub}</Text>
                  </View>
                  <ChevRight />
                </Pressable>
                {i < section.items.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.signOutWrap}>
        <AppButton title="Sign Out" variant="danger" onPress={() => void signOut()}>
          <SignOutIcon />
          <Text style={styles.signOutText}>Sign Out</Text>
        </AppButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  identity: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.ink,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    width: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
  },
  saveNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkLight,
    marginTop: 4,
  },
  error: {
    fontFamily: fonts.sans,
    color: colors.dangerText,
    marginTop: 8,
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  group: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.inkLight,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  rowSub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkLight,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  signOutWrap: {
    paddingHorizontal: 24,
  },
  signOutText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.dangerText,
  },
});
