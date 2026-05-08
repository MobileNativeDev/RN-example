import { useRef } from 'react';
import { ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import LinearGradient from 'react-native-linear-gradient';

export const CustomBottomModalWithGradient = ({
  isVisible,
  onClose,
  children,
  height,
}: {
  isVisible: boolean;
  onClose: () => void;
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
      swipeDirection={['down']}
      scrollTo={handleScrollTo}
      scrollOffsetMax={400 - 300}
      propagateSwipe={true}
      backdropOpacity={0.4}
      style={{ flex: 1, justifyContent: 'flex-end', margin: 0 }}
    >
      <LinearGradient
        colors={['#3C1053', '#550844']}
        style={{
          height: `${height}%`,
          paddingTop: 23,
          paddingBottom: 5,
          paddingHorizontal: 3,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowRadius: 10,
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            paddingBottom: 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};
