import {
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Keyboard,
  Linking,
  InteractionManager,
} from 'react-native';
import { Alert } from '@utils/alert';
import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { uploadAvatar, updateProfile, deleteMe } from '@api/users';
import { fetchMeAndSave, saveTokens } from '@store/auth/operations';
import { logout as apiLogout } from '@api/auth';
import ImagePicker from 'react-native-image-crop-picker';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@store/auth/selectors';
import { CustomInput } from '@components/customComponents/CustomInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clear as clearAlarms } from '../../store/alarms/slice';
import { clearQueue } from '../../store/offlineQueue/slice';
import { clearTokens } from '../../store/auth/slice';
import { CommonActions, useNavigation } from '@react-navigation/native';
import UserIcon from '@assets/svg/UserIcon.svg';
import { deleteDeviceToken } from '@services/deleteDeviceToken';
import { clearAlarmBootstrap } from '@services/alarmBootstrap/storage';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { clearGoogleSession } from '@services/auth/googleSession';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

export const ChangeMyUsername = () => {
  const user = useSelector(selectAuthUser);
  const navigation = useNavigation<any>();

  const [name, setName] = useState(user?.name ?? '');
  const [registeredWith, setRegisteredWith] = useState(
    (user?.email || user?.phoneNumber) ?? 'Tiktok account',
  );

  const [imageUri, setImageUri] = useState<string | null>(
    user?.avatarUrl ?? null,
  );

  useEffect(() => {
    setImageUri(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  const dispatch = useDispatch();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const nameInputRef = useRef<any>(null);

  const handleToggleEditName = async () => {
    if (isSavingName) return;

    if (isEditingName) {
      // currently editing -> save
      setIsSavingName(true);
      try {
        await updateProfile({ name });
        // refresh local user
        dispatch(fetchMeAndSave() as any);
        setIsEditingName(false);
      } catch (e) {
        console.warn('Failed to update profile name', e);
        Alert.alert('Save failed', 'Unable to save name. Please try again.');
      } finally {
        setIsSavingName(false);
      }
    } else {
      // enable editing and focus
      setIsEditingName(true);
      setTimeout(() => nameInputRef.current?.focus(), 60);
    }
  };

  const showGalleryPermissionAlert = (status: PermissionStatus) => {
    const shouldOpenSettings = status === 'blocked' || Platform.OS === 'ios';
    const message = shouldOpenSettings
      ? 'Gallery access was denied. Please enable it in Settings to change your photo.'
      : 'Gallery access is required to select a picture.';

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        Alert.alert(
          'Gallery permission required',
          message,
          shouldOpenSettings
            ? [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openSettings(),
                },
              ]
            : [{ text: 'OK' }],
        );
      }, 250);
    });
  };

  const requestGalleryPermission = async (): Promise<PermissionStatus> => {
    if (Platform.OS === 'android') {
      const permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(permission, {
        title: 'Gallery Permission',
        message: 'App needs access to your gallery to select a picture.',
        buttonPositive: 'OK',
      });
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      }
      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'blocked';
      }
      return 'denied';
    }

    if (Platform.OS === 'ios') {
      try {
        const permission = PERMISSIONS.IOS.PHOTO_LIBRARY;
        const status = await check(permission);

        if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
          return 'granted';
        }

        if (status === RESULTS.BLOCKED) {
          return 'blocked';
        }

        const result = await request(permission);

        if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
          return 'granted';
        }

        if (result === RESULTS.BLOCKED) {
          return 'blocked';
        }

        return 'denied';
      } catch (error) {
        console.warn('Failed to request gallery permission', error);
        return 'blocked';
      }
    }

    return 'granted';
  };

  const handleChangePhoto = async () => {
    const permissionStatus = await requestGalleryPermission();
    if (permissionStatus !== 'granted') {
      showGalleryPermissionAlert(permissionStatus);
      return;
    }

    try {
      const res = await ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        cropperCircleOverlay: true,
        width: 800,
        height: 800,
        compressImageQuality: 0.9,
      });
      if (res && res.path) {
        setImageUri(res.path);

        try {
          const fd = new FormData();
          const fileUri =
            Platform.OS === 'ios' && !res.path.startsWith('file://')
              ? `file://${res.path}`
              : res.path;
          fd.append('file', {
            uri: fileUri,
            name: 'avatar.jpg',
            type: (res.mime as string) || 'image/jpeg',
          } as any);

          await uploadAvatar(fd);
          dispatch(fetchMeAndSave() as any);
        } catch (uploadErr) {
          console.warn('Avatar upload failed', uploadErr);
          Alert.alert(
            'Upload failed',
            'Failed to upload avatar. Please try again.',
          );
        }
      }
    } catch (error: any) {
      const errorCode = String(error?.code ?? '').toLowerCase();
      const errorMessage = String(error?.message ?? '').toLowerCase();
      const isPermissionError =
        errorCode.includes('permission') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('denied');

      if (isPermissionError) {
        showGalleryPermissionAlert(
          Platform.OS === 'ios' ? 'blocked' : 'denied',
        );
        return;
      }

      if (
        errorCode !== 'e_picker_cancelled' &&
        errorCode !== 'picker_cancelled'
      ) {
        console.warn('Image picker failed', error);
      }
    }
  };
  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMe();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete account.');
              return;
            }

            try {
              try {
                await apiLogout();
                try {
                  await clearGoogleSession();
                } catch (googleErr) {
                  Alert.alert(
                    'Error',
                    'Failed to log out from Google account.',
                  );
                  console.warn('Google sign out failed', googleErr);
                }
              } catch (e) {}

              dispatch(saveTokens(null, null) as any);
              dispatch(clearTokens());
              await deleteDeviceToken();

              dispatch(clearAlarms());
              dispatch(clearQueue());
              clearAlarmBootstrap();

              try {
                const keys = await AsyncStorage.getAllKeys();
                const toRemove = keys.filter(
                  k => k === 'OFFLINE_MUTATIONS_V1' || k === 'RQ_CACHE_v1',
                );
                if (toRemove.length > 0)
                  await AsyncStorage.multiRemove(toRemove);
              } catch (e) {}
            } catch (e) {
              console.warn('Post-delete cleanup failed', e);
            }

            try {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'AuthNavigation' }],
                }),
              );
            } catch (e) {
              try {
                (navigation as any).navigate('AuthNavigation', {
                  screen: 'LoginScreen',
                });
              } catch (err) {}
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 px-6 pt-6 items-center bg-transparent">
      <View className="h-2" />

      <View
        className="rounded-full overflow-hidden mt-2 mb-3"
        style={{ width: 183, height: 183 }}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{
              width: 183,
              height: 183,
            }}
            className="bg-whiteWithTransparentColor"
            resizeMode="cover"
          />
        ) : (
          <View className="w-[184px] h-[184px]  rounded-full bg-white/10 items-center justify-center">
            <UserIcon width={183} height={183} />
          </View>
        )}
      </View>

      <TouchableOpacity onPress={handleChangePhoto}>
        <Text className="text-pink-400 mb-4 font-regular">Change photo</Text>
      </TouchableOpacity>

      <View className="w-full relative">
        <TouchableOpacity
          className="absolute right-4 top-2 z-20"
          onPress={handleToggleEditName}
          disabled={isSavingName}
        >
          <Text className="text-pink-400 font-regular">
            {isSavingName ? 'Saving...' : isEditingName ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>

        <CustomInput
          ref={nameInputRef}
          styles="mb-3"
          textPlaceholder="Name"
          placeholder=""
          autoCapitalize="none"
          value={name}
          onChangeText={setName}
          isEditable={isEditingName}
        />
      </View>

      <View className="w-full relative mt-3">
        <CustomInput
          styles="mb-3"
          textPlaceholder="Registered with:"
          placeholder=""
          autoCapitalize="none"
          value={registeredWith}
          onChangeText={setRegisteredWith}
          isEditable={false}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: Platform.OS === 'ios' ? 34 : 16,
        }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,1)',
            backgroundColor: 'rgba(255,255,255,0.06)',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
          }}
          onPress={() => {
            try {
              Keyboard.dismiss();
            } catch (e) {}
            handleDelete();
          }}
        >
          <Text className="text-redColor text-center font-regular">
            Delete Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
