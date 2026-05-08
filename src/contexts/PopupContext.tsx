import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CustomPopup } from '@components/CustomPopup';
import { setAlertHandler } from '@utils/alert';

interface PopupButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface PopupConfig {
  title: string;
  message?: string;
  buttons?: PopupButton[];
}

interface BannerConfig {
  title: string;
  message?: string;
  onPress?: () => void;
  durationMs?: number;
}

interface PopupContextType {
  showPopup: (config: PopupConfig) => void;
  hidePopup: () => void;
  showBanner: (config: BannerConfig) => void;
  hideBanner: () => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

const DEFAULT_BANNER_CONFIG: BannerConfig = {
  title: '',
  message: '',
  durationMs: 3000,
};

const InAppNotificationBanner: React.FC<{
  visible: boolean;
  title: string;
  message?: string;
  onPress?: () => void;
}> = ({ visible, title, message, onPress }) => {
  const translateY = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : -16,
        duration: visible ? 220 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 220 : 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.bannerWrapper,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Pressable onPress={onPress} style={styles.bannerCard}>
          <LinearGradient
            colors={['#FF5FA2', '#D54BCA', '#7B43F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          />
          <View style={styles.bannerGlow} />
          <View style={styles.bannerContent}>
            <Text
              className="font-semibold text-[17px]"
              style={styles.bannerTitle}
              numberOfLines={1}
            >
              {title}
            </Text>
            {!!message && (
              <Text
                className="font-regular text-[14px] mt-1"
                style={styles.bannerMessage}
                numberOfLines={2}
              >
                {message}
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export const PopupProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<PopupConfig>({
    title: '',
    message: '',
    buttons: [],
  });
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>(
    DEFAULT_BANNER_CONFIG,
  );
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPopup = useCallback((newConfig: PopupConfig) => {
    setConfig(newConfig);
    setVisible(true);
  }, []);

  const hidePopup = useCallback(() => {
    setVisible(false);
  }, []);

  const clearBannerTimer = useCallback(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  }, []);

  const hideBanner = useCallback(() => {
    clearBannerTimer();
    setBannerVisible(false);
  }, [clearBannerTimer]);

  const showBanner = useCallback(
    (newConfig: BannerConfig) => {
      clearBannerTimer();
      const nextConfig = {
        ...DEFAULT_BANNER_CONFIG,
        ...newConfig,
      };

      setBannerConfig(nextConfig);
      setBannerVisible(true);

      bannerTimerRef.current = setTimeout(() => {
        setBannerVisible(false);
        bannerTimerRef.current = null;
      }, nextConfig.durationMs ?? 3000);
    },
    [clearBannerTimer],
  );

  const handleBannerPress = useCallback(() => {
    const onPress = bannerConfig.onPress;
    hideBanner();
    onPress?.();
  }, [bannerConfig, hideBanner]);

  useEffect(() => {
    setAlertHandler(showPopup);
  }, [showPopup]);

  useEffect(
    () => () => {
      clearBannerTimer();
    },
    [clearBannerTimer],
  );

  const value = useMemo(
    () => ({ showPopup, hidePopup, showBanner, hideBanner }),
    [showPopup, hidePopup, showBanner, hideBanner],
  );

  return (
    <PopupContext.Provider value={value}>
      {children}
      <InAppNotificationBanner
        visible={bannerVisible}
        title={bannerConfig.title}
        message={bannerConfig.message}
        onPress={handleBannerPress}
      />
      <CustomPopup
        visible={visible}
        title={config.title}
        message={config.message}
        buttons={config.buttons}
        onClose={hidePopup}
      />
    </PopupContext.Provider>
  );
};

const styles = StyleSheet.create({
  bannerWrapper: {
    position: 'absolute',
    top: 72,
    left: 16,
    right: 16,
    zIndex: 1200,
    elevation: 1200,
    alignSelf: 'stretch',
  },
  bannerCard: {
    position: 'relative',
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#B533D6',
    shadowOpacity: 0.34,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  bannerContent: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  bannerGlow: {
    position: 'absolute',
    right: -20,
    top: -8,
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  bannerTitle: {
    color: '#FFFFFF',
  },
  bannerMessage: {
    color: 'rgba(255,255,255,0.88)',
  },
});

export const usePopup = (): PopupContextType => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};
