import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { toast } from '../store/toast-store';

/** Copy text with light haptic + toast confirmation (requirement #6). */
export async function copyToClipboard(text: string, label = 'Copied'): Promise<void> {
  if (!text) return;
  await Clipboard.setStringAsync(text);
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  toast.success(label);
}
