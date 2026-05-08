import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

interface PopupButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomPopupProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: PopupButton[];
  onClose: () => void;
}

const COLORS = {
  popupBase: '#12050E',
  pinkGlow: '#F1679B',
  btnGradientTop: '#F1679B',
  btnGradientBottom: '#E92F80',
  border: 'rgba(255, 255, 255, 0.15)',
};

export const CustomPopup: React.FC<CustomPopupProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
}) => {
  const handleButtonPress = (button: PopupButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={1}
          reducedTransparencyFallbackColor="black"
        />

        <View style={styles.popupContainer}>
          <LinearGradient
            colors={[COLORS.pinkGlow, 'rgba(241, 103, 155, 0.3)']}
            style={styles.pinkGlowRadial}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.8 }}
          />

          <BlurView
            style={styles.blurredPopup}
            blurType="dark"
            blurAmount={12}
            reducedTransparencyFallbackColor="black"
          />

          <View style={styles.glassOverlay} />

          <View style={styles.contentContainer}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              {message && <Text style={styles.message}>{message}</Text>}
            </View>

            <View style={styles.buttonsContainer}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      button.style === 'cancel'
                        ? ['#444444', '#222222']
                        : [COLORS.btnGradientTop, COLORS.btnGradientBottom]
                    }
                    style={[styles.button, index > 0 && styles.buttonSpacing]}
                  >
                    <Text style={styles.buttonText}>{button.text}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  blurredPopup: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    opacity: 0.9,
  },
  pinkGlowRadial: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  contentContainer: {
    paddingVertical: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    zIndex: 10,
  },
  textContainer: {
    width: '100%',
    marginBottom: 35,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Fredoka-SemiBold',
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
  },
  message: {
    fontFamily: 'Fredoka-Regular',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.95,
  },
  buttonsContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 64,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSpacing: {
    marginTop: 14,
  },
  buttonText: {
    fontFamily: 'Fredoka-SemiBold',
    fontWeight: '600',
    fontSize: 22,
    color: '#FFFFFF',
  },
});
