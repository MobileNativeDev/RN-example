import React, { useCallback, useEffect, useState } from 'react';
import {
  SectionList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Alert } from '@utils/alert';
import LinearGradient from 'react-native-linear-gradient';
import { LoaderModal } from '@components/customComponents/LoaderModal';
import useNotifications from '../hooks/useNotification';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { Friend, Notification } from '@appTypes/types';
import UserIcon from '@assets/svg/UserIcon.svg';
import { formatFullDateTime, formatTimeString } from '@utils/time';
import { useQueryClient } from '@tanstack/react-query';
import BigClock from '@assets/svg/BigClock.svg';
import { markAllNotificationsRead } from '@api/notifications';
import { listFriends } from '@api/friends';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import useUnreadNotificationsCount from '@hooks/useUnreadNotificationsCount';
import Arrow from '@assets/svg/Arrow.svg';
import {
  handleAccept,
  handleAcceptAlarm,
  handleDecline,
  handleDeclineAlarm,
  handleDetailAlarm,
  // readNotification,
  scheduledAtToLocal,
  scheduledAtToLocalFromUTC,
  setReactQueryClient,
} from '@utils/notificationFunctions';
import logger from '@utils/logger';
import { clearAppIconBadge } from '@services/notifications/badge';

export const NotificationsScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const autoOpenedNotificationRef = React.useRef<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>(
    {},
  );
  const [isAccepting, setIsAccepting] = useState(false);
  const openAlarmId = route.params?.openAlarmId as string | undefined;
  const openEvent = route.params?.openEvent as string | undefined;

  const addProcessing = (id: string) =>
    setProcessingIds(prev => ({ ...prev, [id]: true }));
  const removeProcessing = (id: string) =>
    setProcessingIds(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  const {
    items,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications({
    page: 1,
    limit: 10,
  });
  console.log('items', items);

  const { count: unreadCount } = useUnreadNotificationsCount();
  const refreshNotifications = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const sections = React.useMemo(() => {
    const map = new Map<string, { date: Date; items: Notification[] }>();

    items.forEach((it: Notification) => {
      const d = it.createdAt ? new Date(it.createdAt) : new Date();
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, { date: d, items: [] });
      map.get(key)!.items.push(it);
    });

    const out = Array.from(map.values())
      .map(({ date, items: secItems }) => ({
        title: `${date.toLocaleString('en', {
          month: 'short',
        })}, ${date.getDate()} ${date.getFullYear()}`,
        date,
        data: secItems
          .slice()
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return out;
  }, [items]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      const doMarkAllRead = async () => {
        await clearAppIconBadge();

        if (!unreadCount || unreadCount <= 0) return;
        try {
          await markAllNotificationsRead();
          if (cancelled) return;
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({
            queryKey: ['notifications', 'unreadCount'],
          });
          try {
            await refetch?.();
          } catch {}
        } catch (e) {
          logger.warn(
            '[NotificationsScreen] markAllNotificationsRead failed',
            e,
          );
        }
      };

      doMarkAllRead();

      return () => {
        cancelled = true;
      };
    }, [unreadCount, queryClient, refetch]),
  );

  useEffect(() => {
    try {
      setReactQueryClient(queryClient);
    } catch (e) {}
    return () => {
      try {
        setReactQueryClient(null);
      } catch (e) {}
    };
  }, [queryClient]);

  useEffect(() => {
    const openKey = openAlarmId
      ? `${openEvent ?? 'ALARM'}:${openAlarmId}`
      : null;

    if (
      !openKey ||
      autoOpenedNotificationRef.current === openKey ||
      items.length === 0
    ) {
      return;
    }

    const targetNotification = items.find((item: Notification) => {
      if (item.alarmId !== openAlarmId) return false;
      return openEvent ? item.event === openEvent : true;
    });

    if (!targetNotification) return;

    autoOpenedNotificationRef.current = openKey;

    const localTime = scheduledAtToLocal({
      scheduledAt: targetNotification?.scheduledAt,
      timezone: targetNotification?.timezone,
    });

    handleDetailAlarm(targetNotification, localTime, navigation);
  }, [items, navigation, openAlarmId, openEvent]);

  const handleOpenFriendNotification = useCallback(
    async (item: Notification) => {
      console.log('item', item);

      try {
        const friendsRaw = await queryClient.fetchQuery({
          queryKey: ['friends'],
          queryFn: listFriends,
          staleTime: 30_000,
        });

        const friends = (friendsRaw as Friend[]) ?? [];
        const actorId = item.actor?.actorId ?? null;

        const friend =
          friends.find(friendItem => friendItem.id === item.friendshipId) ??
          friends.find(friendItem => {
            if (!actorId) return false;

            return (
              friendItem.user?.id === actorId ||
              friendItem.friendUser?.id === actorId
            );
          });

        if (!friend) {
          Alert.alert(
            'Friend not found',
            'Unable to open this friend request right now.',
          );
          return;
        }

        navigation.navigate('MainContentNavigation', {
          screen: 'FriendDetailsScreen',
          params: { friend },
        });
      } catch (error) {
        logger.warn(
          '[NotificationsScreen] Failed to open friend notification',
          error,
        );
        Alert.alert('Error', 'Failed to open friend details.');
      }
    },
    [navigation, queryClient],
  );

  const renderItem = ({ item }: { item: Notification }) => {
    const title = item.title || '';
    const subtitle = item.body || '';
    const type = item.type;
    const event = item.event || null;
    const trimmedMessage = item.message?.trim();
    const localTime = scheduledAtToLocal({
      scheduledAt: item?.scheduledAt,
      timezone: item?.timezone,
    });
    const createdLocalTime = scheduledAtToLocalFromUTC({
      scheduledAt: item?.createdAt,
      timezone: item?.timezone || 'Europe/Kyiv',
    });

    const isPastAlarm = (() => {
      const iso = localTime?.localIso || item?.scheduledAt;
      if (!iso) return false;
      return new Date(iso).getTime() < Date.now();
    })();

    return (
      <View>
        {type === 'FRIEND' ? (
          <TouchableOpacity
            onPress={() => {
              void handleOpenFriendNotification(item);
            }}
            className="border-b border-border2Color mx-3"
          >
            <View className="flex-row gap-3 py-4">
              {item?.actor?.avatarUrl ? (
                <Image
                  source={{ uri: item.actor.avatarUrl }}
                  className="w-[48px] h-[48px] rounded-full"
                />
              ) : (
                <View className="w-[48px] h-[48px] rounded-full bg-white/10 items-center justify-center">
                  <UserIcon />
                </View>
              )}
              <View className="flex-1">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white text-lg font-regular">
                    {item?.actor?.name || 'New Friend Request'}
                  </Text>
                  <Text className="text-textGray text-xs font-medium">
                    {formatTimeString(createdLocalTime?.utcIso)}
                  </Text>
                </View>
                <Text className="text-textGray text-[15px] font-regular">
                  {item.title === 'Friend request approved'
                    ? 'Your request has been approved!'
                    : item.title === 'New friend request'
                    ? 'You got a new friend request. Accept to start sending alarms!'
                    : item.title}
                </Text>
                {item.approvalStatus === 'ACCEPTED' ? (
                  <View className="border border-viewedStatus rounded-md px-[10px] py-1 mt-2 w-[100px] items-center justify-center">
                    <Text className="text-viewedStatus font-regular text-sm">
                      Accepted
                    </Text>
                  </View>
                ) : item.approvalStatus === 'REJECTED' ? (
                  <View className="border border-declinedStatus rounded-md px-[10px] py-1 mt-2 w-[100px] items-center justify-center">
                    <Text className="text-declinedStatus font-regular text-sm">
                      Declined
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row gap-4 mt-3">
                    <TouchableOpacity
                      onPress={() =>
                        item.friendshipId &&
                        handleDecline(item.friendshipId, async () => {
                          await refreshNotifications();
                        })
                      }
                      activeOpacity={0.8}
                      className="border border-white py-3 px-5 rounded-[14px] items-center justify-center bg-whiteWithTransparentColor "
                      style={{ boxSizing: 'border-box' }}
                    >
                      <Text className="font-semibold text-[17px] text-white">
                        Decline
                      </Text>
                    </TouchableOpacity>

                    <LinearGradient
                      colors={['#E92F80', '#F1679B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="rounded-[14px]"
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={async () => {
                          if (!item.friendshipId) return;
                          setIsAccepting(true);
                          addProcessing(item.friendshipId);
                          try {
                            await handleAccept(item.friendshipId, async () => {
                              await refreshNotifications();
                            });
                            try {
                              await queryClient.invalidateQueries({
                                queryKey: ['notifications'],
                              });
                              await queryClient.invalidateQueries({
                                queryKey: ['notifications', 'unreadCount'],
                              });
                            } catch (e) {}
                          } catch (e) {
                            logger.warn(
                              '[NotificationsScreen] handleAccept failed',
                              e,
                            );
                          } finally {
                            removeProcessing(item.friendshipId);
                            setIsAccepting(false);
                          }
                        }}
                        className=" py-3 px-5 rounded-[14px] items-center justify-center "
                      >
                        <Text className="font-semibold text-[17px] text-white">
                          {item.friendshipId && processingIds[item.friendshipId]
                            ? 'Accepting...'
                            : 'Accept'}
                        </Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ) : (type === 'ALARM' && event === 'FRIEND_ALARM_ACCEPTED') ||
          (type === 'ALARM' && event === 'FRIEND_ALARM_REJECTED') ||
          (type === 'ALARM' && event === 'FRIEND_ALARM_REQUEST') ||
          (type === 'ALARM' && event === 'FRIEND_GOT_ALARM') ? (
          <TouchableOpacity
            onPress={async () => {
              // await readNotification(item.id);

              await handleDetailAlarm(item, localTime, navigation);
            }}
            className="border-b border-border2Color mx-3"
          >
            <View className="flex-row gap-3 py-4">
              {item?.actor?.avatarUrl ? (
                <Image
                  source={{ uri: item.actor.avatarUrl }}
                  className="w-[48px] h-[48px] rounded-full"
                />
              ) : (
                <View className="w-[48px] h-[48px] rounded-full bg-white/10 items-center justify-center">
                  <UserIcon />
                </View>
              )}
              <View className="flex-1">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white text-lg font-regular">
                    {item?.actor?.name || 'New Friend Request'}
                  </Text>
                  <Text className="text-textGray text-xs font-medium">
                    {formatTimeString(createdLocalTime?.utcIso)}
                  </Text>
                </View>
                <Text className="text-textGray text-[15px] font-regular">
                  {event === 'FRIEND_GOT_ALARM' && !trimmedMessage
                    ? 'I got your alarm'
                    : item.body}
                </Text>
                <View className="flex-row items-center mt-3">
                  <BigClock width={24} height={24} />
                  <Text className="text-white text-[15px] font-regular mx-1">
                    {item?.scheduledAt
                      ? formatFullDateTime(
                          localTime?.localIso || item.scheduledAt,
                        )
                      : formatTimeString(item.createdAt)}
                  </Text>
                  <Arrow />
                </View>
                {event === 'FRIEND_GOT_ALARM' && trimmedMessage ? (
                  <View className="border border-border2Color rounded-xl bg-pinkWithTransparent px-3 py-2 mt-3">
                    <Text className="font-regular text-white">
                      {trimmedMessage}
                    </Text>
                  </View>
                ) : item.approvalStatus === 'ACCEPTED' ? (
                  <View className="border border-viewedStatus rounded-md px-[10px] mt-2 w-[100px] items-center justify-center">
                    <Text className="text-viewedStatus font-regular text-sm">
                      Accepted
                    </Text>
                  </View>
                ) : item.approvalStatus === 'REJECTED' ? (
                  <View className="border border-declinedStatus rounded-md px-[10px] py-1 mt-2 w-[100px] items-center justify-center">
                    <Text className="text-declinedStatus font-regular text-sm">
                      Declined
                    </Text>
                  </View>
                ) : item.approvalStatus === 'PENDING' ? (
                  isPastAlarm ? (
                    <View className="border border-orange-500 rounded-md px-[10px] py-1 mt-2 w-[130px] items-center justify-center">
                      <Text className="text-orange-500 font-regular text-sm">
                        Missed alarm
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row mt-3">
                      <TouchableOpacity
                        onPress={() => {
                          item.alarmId &&
                            handleDeclineAlarm(item.alarmId, async () => {
                              await refreshNotifications();
                            });
                        }}
                        activeOpacity={0.8}
                        className="border border-white py-3 px-5 rounded-[14px] items-center justify-center bg-whiteWithTransparentColor mr-4"
                        style={{ boxSizing: 'border-box' }}
                      >
                        <Text className="font-semibold text-[17px] text-white">
                          Decline
                        </Text>
                      </TouchableOpacity>

                      <LinearGradient
                        colors={['#E92F80', '#F1679B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="rounded-[14px]"
                      >
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={async () => {
                            if (!item.alarmId) {
                              Alert.alert(
                                'Error',
                                'Cannot accept: missing alarm id',
                              );
                              return;
                            }
                            setIsAccepting(true);
                            addProcessing(item.alarmId);
                            try {
                              await handleAcceptAlarm(
                                item.alarmId,
                                async () => {
                                  await refreshNotifications();
                                },
                                () => {
                                  handleDetailAlarm(
                                    item,
                                    localTime,
                                    navigation,
                                  );
                                },
                              );
                              // ensure notifications and alarms are refreshed
                              try {
                                await queryClient.invalidateQueries({
                                  queryKey: ['notifications'],
                                });
                                await queryClient.invalidateQueries({
                                  queryKey: ['notifications', 'unreadCount'],
                                });
                              } catch (e) {}
                              queryClient.invalidateQueries({
                                queryKey: ['alarms', 'upcoming'],
                              });
                              queryClient.invalidateQueries({
                                queryKey: ['alarms', 'next'],
                              });
                            } catch (e) {
                              logger.warn(
                                '[NotificationsScreen] handleAcceptAlarm failed',
                                e,
                              );
                            } finally {
                              removeProcessing(item.alarmId);
                              setIsAccepting(false);
                            }
                          }}
                          className="py-3 px-5 rounded-[14px] items-center justify-center "
                        >
                          <Text className="font-semibold text-[17px] text-white">
                            {item.alarmId && processingIds[item.alarmId]
                              ? 'Accepting...'
                              : 'Accept'}
                          </Text>
                        </TouchableOpacity>
                      </LinearGradient>
                    </View>
                  )
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="w-full px-4" activeOpacity={0.8}>
            <View className="w-full border-b pb-[10px] border-border2Color">
              <Text className="text-white text-lg font-regular">
                {title || JSON.stringify(item)}
              </Text>
              {subtitle ? (
                <Text className="text-textGray text-[15px] font-regular">
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const keyExtractor = useCallback((item: Notification) => String(item.id), []);

  const emptyContentContainerStyle = {
    flexGrow: 1,
    justifyContent: 'center',
  } as const;
  const filledContentContainerStyle = {
    paddingBottom: 120,
    flexGrow: 1,
  } as const;

  const ItemSeparator = useCallback(() => <View style={{ height: 10 }} />, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: any }) => (
      <View className="mx-4 mb-[10px] py-3">
        <Text className="text-white text-lg font-semibold">
          {section.title}
        </Text>
      </View>
    ),
    [],
  );

  const ListFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <View className="py-4 items-center">
          <Text className="text-textGray">Loading more...</Text>
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  const ListEmpty = useCallback(
    () => (
      <View className="items-center justify-center px-6">
        {isLoading ? null : (
          <Text className="text-textGray text-2xl font-regular text-center max-w-[286px]">
            No notifications yet.
          </Text>
        )}
      </View>
    ),
    [isLoading],
  );

  return (
    <View className="flex-1 relative pt-[10px]">
      <LoaderModal isVisible={isLoading || isAccepting} />
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={
          items.length === 0
            ? emptyContentContainerStyle
            : filledContentContainerStyle
        }
        ItemSeparatorComponent={ItemSeparator}
        renderItem={renderItem}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        renderSectionHeader={renderSectionHeader}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={8}
        removeClippedSubviews
      />
    </View>
  );
};
