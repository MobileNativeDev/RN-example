import { View, Image } from 'react-native';
import { Alert } from '@utils/alert';
import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinierButton } from '@components/customComponents/LinierButton';
import { CustomInput } from '@components/customComponents/CustomInput';
import { CustomButton } from '@components/customComponents/CustomButton';
import {
  acceptFriend,
  blockFriend,
  declineFriend,
  deleteFriend,
  resendFriend,
  unblockFriend,
} from '@api/friends';
import { useSelector } from 'react-redux';
import { selectUserId } from '@store/auth/selectors';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import UserIcon from '@assets/svg/UserIcon.svg';
import logger from '@utils/logger';

export const FriendDetailsScreen = () => {
  const route = useRoute();
  const { friend } = route.params as any;
  const myUserId = useSelector(selectUserId);
  const navigation = useNavigation<AuthNavigationProp>();

  // const deepLinkUserId = (route.params as any)?.id;

  const friendData =
    myUserId === friend?.friendUserId ? friend?.user : friend?.friendUser;
  const showOwner = friend?.user.id !== myUserId;

  console.log('friendData', friend);

  const [status, setStatus] = useState<string>(friend.status);
  const [name, setName] = useState(friendData.name);
  const [registeredWith, setRegisteredWith] = useState(
    friendData.phoneNumber ?? 'email',
  );
  const [imageUri] = useState<string | null>(friendData?.avatarUrl ?? null);
  const nameInputRef = useRef<any>(null);
  const queryClient = useQueryClient();

  const handleResent = async () => {
    try {
      await resendFriend(friend.id);
      Alert.alert('Success', 'Invite resent successfully.');
      await queryClient.invalidateQueries({ queryKey: ['friends'] });
    } catch (e) {
    } 
  };

  const handleDelete = (cancel?: boolean) => {
    Alert.alert(
      !cancel ? 'Delete friend' : 'Cancel invite',
      !cancel
        ? 'Are you sure you want to delete this friend?'
        : 'Are you sure you want to cancel this invite?',
      [
        { text: cancel ? 'No' : 'Cancel', style: 'cancel' },
        {
          text: !cancel ? 'Delete' : 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await deleteFriend(friend.id);
                setStatus('DELETED');
                await queryClient.invalidateQueries({ queryKey: ['friends'] });
                if (cancel) {
                  navigation.goBack();
                }
              } catch (err) {
                Alert.alert('Error', 'Failed to delete account.');
              }
            } catch (e) {}
          },
        },
      ],
    );
  };
  const handleBlock = () => {
    Alert.alert(
      'Block Account',
      'Are you sure you want to block this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await blockFriend(friend.id);
                setStatus('BLOCKED');
                friend.blockedByMe = true;
                await queryClient.invalidateQueries({ queryKey: ['friends'] });
              } catch (err) {
                Alert.alert('Error', 'Failed to block account.');
              }
            } catch (e) {}
          },
        },
      ],
    );
  };
  const handleUnblock = () => {
    Alert.alert(
      'Unblock Account',
      'Are you sure you want to unblock this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              try {
                await unblockFriend(friend.id);
                setStatus('ACCEPTED');
                friend.blockedByMe = false;
                await queryClient.invalidateQueries({ queryKey: ['friends'] });
              } catch (err) {
                Alert.alert('Error', 'Failed to unblock account.');
              }
            } catch (e) {}
          },
        },
      ],
    );
  };
  const handleAccept = async (friendId: string) => {
    try {
      await acceptFriend(friendId);
    } catch (e) {
      Alert.alert('Error', 'Failed to accept friend request.');
      return;
    }

    setStatus('ACCEPTED');
    Alert.alert('Success!', 'Friend request accepted.');

    try {
      await queryClient.invalidateQueries({ queryKey: ['friends'] });
    } catch (e) {
      logger.warn('[FriendDetailsScreen] Failed to refresh friends after accept', e);
    }
  };
  const handleDecline = async (friendId: string) => {
    try {
      await declineFriend(friendId);
    } catch (e) {
      Alert.alert('Error', 'Failed to decline friend request.');
      return;
    }

    setStatus('REJECTED');

    try {
      await queryClient.invalidateQueries({ queryKey: ['friends'] });
    } catch (e) {
      logger.warn('[FriendDetailsScreen] Failed to refresh friends after decline', e);
    }
  };

  return (
    <View className="flex-1 ">
      <View className="flex-1 px-6 pt-6 items-center bg-transparent">
        <View className="h-2" />

        <View
          className="rounded-full overflow-hidden mt-2 mb-3"
          style={{ width: 183, height: 183 }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: 183, height: 183 }}
              resizeMode="cover"
            />
          ) : (
            <View className="w-[184px] h-[184px]  rounded-full bg-white/10 items-center justify-center">
              <UserIcon width={60} height={60} />
            </View>
          )}
        </View>

        <View className="w-full relative">
          <CustomInput
            ref={nameInputRef}
            styles="mb-3"
            textPlaceholder="Name"
            placeholder=""
            autoCapitalize="none"
            value={name}
            onChangeText={setName}
            isEditable={false}
          />
        </View>

        <View className="w-full relative">
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
      </View>
      <View className="flex-1 justify-end mb-5 px-4">
        {((status === 'PENDING' && showOwner) ||
          status === 'ACCEPTED' ||
          status === 'BLOCKED' ||
          status === 'DELETED') && (
          <View className="flex-row gap-[10px] mb-4">
            <View className="flex-1">
              <CustomButton
                title={
                  status === 'PENDING' ? 'Approve invite' : 'Delete friend'
                }
                onPress={() => {
                  if (status !== 'PENDING') {
                    handleDelete();
                  } else {
                    handleAccept(friend.id);
                  }
                }}
                textStyle="font-semibold text-white text-lg"
                style="border-white bg-white/10"
                disabled={status === 'DELETED'}
              />
            </View>
            <View className="flex-1">
              <CustomButton
                title={
                  status === 'PENDING'
                    ? 'Decline invite'
                    : status === 'BLOCKED' && friend?.blockedByMe
                    ? 'Unblock friend'
                    : 'Block friend'
                }
                onPress={() => {
                  if (status === 'PENDING') {
                    handleDecline(friend.id);
                  } else if (status === 'BLOCKED') {
                    if (friend?.blockedByMe) handleUnblock();
                    else handleBlock();
                  } else {
                    handleBlock();
                  }
                }}
                textStyle="font-semibold text-white text-lg"
                style={`border-white bg-white/10 ${
                  status === 'BLOCKED' && friend?.blockedByMe && 'bg-[#F1679B]'
                }`}
                disabled={status === 'DELETED'}
              />
            </View>
          </View>
        )}
        {(status === 'ACCEPTED' ||
          (status === 'BLOCKED' && friend?.blockedByMe)) && (
          <LinierButton
            title="Set an Alarm"
            onPress={() => {
              navigation.navigate('MainContentNavigation', {
                screen: 'CreateAlarmScreen',
                params: { friendId: friendData.id },
              });
            }}
          />
        )}

        {status === 'PENDING' && !showOwner && (
          <View className="flex-row gap-[10px] mb-4">
            <View className="flex-1">
              <CustomButton
                title="Resent invite"
                onPress={handleResent}
                textStyle="font-semibold text-white text-lg"
                style="border-white bg-white/10"
              />
            </View>
            <View className="flex-1">
              <CustomButton
                title="Cancel invite"
                onPress={() => {
                  handleDelete(true);
                }}
                textStyle="font-semibold text-white text-lg"
                style={`border-white bg-white/10 `}
              />
            </View>
          </View>
        )}
      </View>
      
    </View>
  );
};
