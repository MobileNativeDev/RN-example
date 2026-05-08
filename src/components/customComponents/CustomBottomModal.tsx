import { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import Modal from 'react-native-modal';

export const CustomBottomModal = ({
  isVisible,
  onClose,
  onModalHide,
  children,
  height,
}: {
  isVisible: boolean;
  onClose: () => void;
  onModalHide?: () => void;
  children: React.ReactNode;
  height: number;
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScrollTo = (p: any) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo(p);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      onModalHide={onModalHide}
      swipeDirection={['down']}
      scrollTo={handleScrollTo}
      scrollOffsetMax={400 - 300}
      propagateSwipe={true}
      backdropOpacity={0.4}
      style={{ flex: 1, justifyContent: 'flex-end', margin: 0 }}
    >
      <View
        className="bg-primaryBackground"
        style={{
          height: `${height}%`,
          paddingTop: 23,
          paddingBottom: 5,
          paddingHorizontal: 3,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          // backgroundColor: 'white',
          shadowRadius: 10,
        }}
      >
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </Modal>
  );
};
