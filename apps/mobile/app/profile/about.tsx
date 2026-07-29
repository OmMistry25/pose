import Constants from 'expo-constants';

import { StubScreen } from '../../src/ui/StubScreen';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <StubScreen
      title="About Pose Match"
      body={`Pose Match helps you recreate reference poses with live on-device guidance.\n\nVersion ${version}`}
    />
  );
}
