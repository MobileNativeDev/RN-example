import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export const LoaderModal = ({
  isVisible,
  text,
}: {
  isVisible: boolean;
  text?: string;
}) => {
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
        {text ? (
          <Text style={{ marginTop: 12, color: '#fff', fontSize: 16 }}>
            {text}
          </Text>
        ) : null}
      </View>
    </View>
  );
};
