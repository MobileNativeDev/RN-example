import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AddFriendIcon from '../../../assets/svg/AddFriendIcon.svg';
import Arrow from '../../../assets/svg/Arrow.svg';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectUserId } from '@store/auth/selectors';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import { AlarmsContainer } from '@components/myAlarms/AlarmsContainer';
import { useFriends } from '../../hooks/useFriends';
import type { Friend } from '@appTypes/types';
import ClockIconFriend from '@assets/svg/ClockIconFriend.svg';
import FriendRequestIcon from '@assets/svg/FriendRequestIcon.svg';
import UserIcon from '@assets/svg/UserIcon.svg';
import logger from '@utils/logger';
import { LoaderModal } from '@components/customComponents/LoaderModal';

type SectionItem = {
  key: 'accepted' | 'pending' | 'requests';
  title: string;
  items: Friend[];
  defaultOpen?: boolean;
  emptyText: string;
};

const FriendRow = React.memo(
  ({
    item,
    myUserId,
    onPress,
    indicator,
  }: {
    item: Friend;
    myUserId: string | null;
    onPress: (friend: Friend) => void;
    indicator?: 'pending' | 'request';
  }) => {
    const friendInfo =
      myUserId === item.friendUserId ? item.user : item.friendUser;

    return (
      <TouchableOpacity onPress={() => onPress(item)} className="w-full">
        <LinearGradient colors={['#540743', '#b51d96']} className="rounded-2xl">
          <View className="rounded-2xl border px-4 py-3 border-white justify-between items-center flex-row">
            <View className="flex-row items-center gap-5">
              {!friendInfo.avatarUrl ? (
                <View className="w-[54px] h-[54px] rounded-full bg-white/10 items-center justify-center">
                  <UserIcon />
                </View>
              ) : (
                <Image
                  source={{ uri: friendInfo.avatarUrl || undefined }}
                  style={{ width: 54, height: 54, borderRadius: 27 }}
                />
              )}
              <Text className="text-white text-base">{friendInfo.name}</Text>
            </View>
            <View className="flex-row items-center gap-4">
              {indicator === 'pending' ? <ClockIconFriend /> : null}
              {indicator === 'request' ? <FriendRequestIcon /> : null}
              <Arrow />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  },
);

const FriendSectionCard = React.memo(
  ({
    section,
    myUserId,
    onPressFriend,
  }: {
    section: SectionItem;
    myUserId: string | null;
    onPressFriend: (friend: Friend) => void;
  }) => (
    <AlarmsContainer
      title={section.title}
      open={section.defaultOpen}
      length={section.items.length}
    >
      {section.items.length > 0 ? (
        <View style={{ paddingBottom: 10 }}>
          {section.items.map((item, index) => (
            <View
              key={item.id}
              style={
                index === section.items.length - 1
                  ? undefined
                  : { marginBottom: 10 }
              }
            >
              <FriendRow
                item={item}
                myUserId={myUserId}
                onPress={onPressFriend}
                indicator={
                  section.key === 'pending'
                    ? 'pending'
                    : section.key === 'requests'
                    ? 'request'
                    : undefined
                }
              />
            </View>
          ))}
        </View>
      ) : (
        <View className="items-center">
          <Text className="text-textGray font-regular text-center max-w-[286px] mb-5">
            {section.emptyText}
          </Text>
        </View>
      )}
    </AlarmsContainer>
  ),
);

export const FriendsScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const myUserId = useSelector(selectUserId);
  const { data: friendsRaw = [], isLoading, refetch } = useFriends();
  const friends: Friend[] = (friendsRaw as any) ?? [];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetch?.();
    } catch (error) {
      logger.warn('[FriendsScreen] refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshing]);

  const handlePressFriend = useCallback(
    (friend: Friend) => {
      navigation.navigate('MainContentNavigation', {
        screen: 'FriendDetailsScreen',
        params: { friend },
      });
    },
    [navigation],
  );

  const handlePressAddNewFriend = useCallback(() => {
    navigation.navigate('MainContentNavigation', {
      screen: 'AddNewFriendScreen',
    });
  }, [navigation]);

  const sections = useMemo<SectionItem[]>(
    () => [
      {
        key: 'accepted',
        title: 'My Friends',
        items: friends.filter(
          f => f.status === 'ACCEPTED' || f.status === 'BLOCKED',
        ),
        defaultOpen: true,
        emptyText: 'No friends yet.',
      },
      {
        key: 'pending',
        title: 'Pending',
        items: friends.filter(
          f => f.friendUserId !== myUserId && f.status === 'PENDING',
        ),
        emptyText: 'No pending invites.',
      },
      {
        key: 'requests',
        title: 'Friend request',
        items: friends.filter(
          f => f.friendUserId === myUserId && f.status === 'PENDING',
        ),
        emptyText: 'No friend requests.',
      },
    ],
    [friends, myUserId],
  );

  const renderSectionItem = useCallback(
    ({ item }: { item: SectionItem }) => (
      <FriendSectionCard
        section={item}
        myUserId={myUserId}
        onPressFriend={handlePressFriend}
      />
    ),
    [handlePressFriend, myUserId],
  );

  const keyExtractor = useCallback((item: SectionItem) => item.key, []);

  return (
    <View className="flex-1">
      <LoaderModal isVisible={isLoading && !refreshing} />
      {!isLoading && !refreshing && friends.length === 0 ? (
        <View className="items-center justify-center flex-1 px-4">
          <Text className="text-textGray text-2xl font-regular text-center max-w-[286px]">
            No friends yet. Add some friends to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          renderItem={renderSectionItem}
          keyExtractor={keyExtractor}
          className="flex-1 relative pt-[10px] px-4"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews
        />
      )}
      <View className="absolute bottom-[23px] right-[13px]">
        <LinearGradient
          colors={['#E92F80', '#F1679B']}
          className="rounded-full"
        >
          <TouchableOpacity
            onPress={handlePressAddNewFriend}
            activeOpacity={0.7}
            className="border-2 p-4 rounded-full border-black"
          >
            <AddFriendIcon />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
};
