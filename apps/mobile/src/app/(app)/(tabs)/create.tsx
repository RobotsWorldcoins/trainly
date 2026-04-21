// This screen is a redirect placeholder — the actual create flow
// is launched from the tab bar custom button
import { Redirect } from 'expo-router';

export default function CreateTab() {
  return <Redirect href="/(app)/create-session" />;
}
