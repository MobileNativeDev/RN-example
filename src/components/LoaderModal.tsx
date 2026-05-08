import { ActivityIndicator, StyleSheet, View } from 'react-native';

export const LoaderModal = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  return (
    <View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 1000, elevation: 1000, backgroundColor: 'rgba(0,0,0,0.25)' },
      ]}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    </View>
  );
};
