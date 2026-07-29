import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../src/supabase/client';
import { colors, fonts } from '../../src/theme/tokens';
import { AppButton } from '../../src/ui/AppButton';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setIsSubmitting(false);
      if (error) setErrorMessage(error.message);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: name.trim() ? { display_name: name.trim() } : undefined,
      },
    });
    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    if (!data.session) {
      setInfoMessage('Account created. Check your email to confirm before signing in.');
      setMode('signin');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: insets.top + 8 }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Text style={styles.brand}>Pose Match</Text>
        <Text style={styles.heading}>
          {mode === 'signin' ? 'Welcome\nback.' : 'Get\nstarted.'}
        </Text>

        <View style={styles.segment}>
          {(['signin', 'signup'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              style={[styles.segmentBtn, mode === m && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          {mode === 'signup' ? (
            <View>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Jordan Lee"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
              />
            </View>
          ) : null}
          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>
          <View>
            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete={mode === 'signin' ? 'password' : 'password-new'}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

          {isSubmitting ? (
            <ActivityIndicator color={colors.ink} style={{ marginTop: 8 }} />
          ) : (
            <AppButton
              title={mode === 'signin' ? 'Sign In' : 'Create Account'}
              onPress={() => void handleSubmit()}
              style={{ marginTop: 4 }}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  brand: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.warm,
    marginBottom: 10,
    marginTop: 8,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 46,
    color: colors.ink,
    lineHeight: 50,
    marginBottom: 20,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.inkLight,
  },
  segmentTextActive: {
    color: colors.bg,
  },
  form: {
    gap: 14,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.inkLight,
    marginBottom: 7,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.sans,
    color: colors.dangerText,
    fontSize: 14,
  },
  info: {
    fontFamily: fonts.sans,
    color: colors.inkMid,
    fontSize: 14,
  },
});
