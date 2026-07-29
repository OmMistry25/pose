import { Redirect } from 'expo-router';

/** Sign-up is handled by the segmented control on the sign-in screen. */
export default function SignUpRedirect() {
  return <Redirect href="/sign-in" />;
}
