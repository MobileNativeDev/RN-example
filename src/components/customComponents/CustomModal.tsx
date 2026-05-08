import Modal from 'react-native-modal';
import { View } from 'react-native';

export const CustomModal = ({
  isVisible,
  onClose,
  styles,
  children,
  position = 'center',
}: {
  isVisible: boolean;
  onClose: () => void;
  styles?: string;
  children: React.ReactNode;
  position?: 'center' | 'flex-end';
}) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      animationIn="fadeIn"
      animationOut="fadeOut"
      backdropOpacity={0}
      style={{ justifyContent: position, margin: 0, alignItems: 'center' }}
    >
      <View className={`bg-darkWhite rounded-lg w-[80%] ${styles}`}>
        {children}
      </View>
    </Modal>
  );
};
