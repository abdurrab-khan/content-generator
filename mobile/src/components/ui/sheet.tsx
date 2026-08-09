import { Modal, Pressable, View } from 'react-native';
import { colors, radii } from '../../theme';
import { AppText } from './app-text';

/**
 * Minimal bottom sheet built on RN Modal — slide-up animation, dimmed
 * backdrop (tap to dismiss), drag handle. Swap for @gorhom/bottom-sheet
 * later if gesture-driven sheets become necessary.
 */

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close sheet" />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl + 4,
            borderTopRightRadius: radii.xl + 4,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 34,
            maxHeight: '82%',
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 44,
              height: 5,
              borderRadius: radii.full,
              backgroundColor: colors.borderStrong,
              marginBottom: 14,
            }}
          />
          {title ? (
            <AppText variant="subheading" style={{ marginBottom: 14 }}>
              {title}
            </AppText>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}
