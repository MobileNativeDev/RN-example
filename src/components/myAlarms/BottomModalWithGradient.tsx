import Modal from 'react-native-modal';
import { ScrollView, View } from 'react-native';
import { useRef } from 'react';
import LinearGradient from 'react-native-linear-gradient';

export const BottomModalWithGradient = ({
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
      scrollTo={handleScrollTo}
      scrollOffsetMax={400 - 300}
      propagateSwipe={true}
      backdropOpacity={0.7}
      style={{
        flex: 1,
        justifyContent: 'flex-end',
        margin: 0,
      }}
    >
      <LinearGradient
        colors={['#3C1053', '#550844']}
        style={{
          height: height,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }}
      >
        <View
          className="px-4"
          style={{
            flex: 1,
            paddingBottom: 5,
            paddingHorizontal: 4,
          }}
        >
          <View className="mt-1 mb-2 justify-center items-center">
            <View className="h-[5px] w-9 bg-white" />
          </View>

          <View className="flex-1">{children}</View>
        </View>
      </LinearGradient>
    </Modal>
  );
};
