import { requestContactsPermission } from '@utils/permissions';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Alert } from '@utils/alert';
import Contacts from 'react-native-contacts';
import LinearGradient from 'react-native-linear-gradient';
import SearchWhiteIcon from '../../../assets/svg/SearchWhiteIcon.svg';
import { useSelector } from 'react-redux';
import { selectUserId } from '@store/auth/selectors';
import UserIcon from '../../../assets/svg/UserIcon.svg';
import Clipboard from '@react-native-clipboard/clipboard';
import { LoaderModal } from '@components/customComponents/LoaderModal';
import { createFriend, importContacts } from '@api/friends';
import { buildInviteLink } from '../../config/invite';
import { useQueryClient } from '@tanstack/react-query';
import { cleanPhone, normalizeContactName } from '@utils/contact';
import { safeStringify } from '@utils/debug';
import logger from '@utils/logger';

const ContactRow = React.memo(
  ({
    item,
    onAdd,
    onInvite,
  }: {
    item: any;
    onAdd: (contact: any) => void;
    onInvite: () => void;
  }) => (
    <TouchableOpacity className="w-full">
      <LinearGradient colors={['#540743', '#b51d96']} className="rounded-2xl">
        <View className="rounded-2xl border px-4 py-3 border-white justify-between items-center flex-row">
          <View className="flex-row items-center gap-5 flex-1">
            {item.thumbnailPath ? (
              <Image
                source={{ uri: item.thumbnailPath }}
                style={{ width: 54, height: 54, borderRadius: 27 }}
                resizeMode="cover"
                onError={() => {}}
              />
            ) : (
              <View className="w-[54px] h-[54px]  rounded-full bg-white/10 items-center justify-center">
                <UserIcon />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-white font-regular text-[17px]">
                {item.name || item.displayName || 'Unknown'}
              </Text>
              {item.name === 'Unknown' && (
                <Text className="text-white font-regular text-[17px] mt-1">
                  {item.phone || item.phoneNumbers?.[0]?.number}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            className="px-4 py-2 rounded-2xl border bg-[#E92F80]"
            onPress={() => {
              if (item.exists) {
                onAdd(item);
                return;
              }
              onInvite();
            }}
          >
            <Text className="font-semibold text-[17px] text-white">
              {item.exists ? 'Add' : 'Invite'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  ),
);

export const AddNewFriendScreen = () => {
  const myUserId = useSelector(selectUserId);
  const queryClient = useQueryClient();

  const [importedContacts, setImportedContacts] = useState<Array<any>>([]);
  const [searchText, setSearchText] = useState('');
  const [loadingImport, setLoadingImport] = useState(false);

  const handleImportContacts = useCallback(async () => {
    try {
      const granted = await requestContactsPermission();
      if (!granted) {
        return [];
      }

      const contacts = await Contacts.getAll();

      const mappedContacts = contacts.map(contact => ({
        recordID: contact.recordID,
        displayName:
          Platform.OS === 'android'
            ? contact.displayName
            : `${contact.givenName} ${contact.familyName}` || 'Unknown',
        phoneNumbers: contact.phoneNumbers || [],
        emails: contact.emailAddresses || [],
        thumbnailPath: (contact as any).thumbnailPath || null,
        status: 'PENDING',
      }));
      return mappedContacts;
    } catch (e: any) {
      logger.warn('[AddNewFriendScreen] failed to load contacts', e);
      Alert.alert('Error', 'Failed to load contacts.');
      return null;
    }
  }, []);

  const handleImportContactsToDB = useCallback(async () => {
    try {
      setLoadingImport(true);
      const friends = await handleImportContacts();

      if (friends === null) {
        return;
      }

      if (friends.length === 0) {
        setImportedContacts([]);
        Alert.alert(
          'Nothing to import',
          'No contacts with phone numbers found.',
        );
        return;
      }

      const contactsPayload = (friends || [])
        .map((f: any) => {
          try {
            const name = normalizeContactName(f.displayName);

            let phone: string | null = null;
            if (Array.isArray(f.phoneNumbers)) {
              for (const p of f.phoneNumbers) {
                const raw = String(p?.number || '').trim();
                const cleaned = cleanPhone(raw);
                if (
                  cleaned &&
                  cleaned.length >= 7 &&
                  cleaned !== '+' &&
                  /\d{7,}/.test(cleaned)
                ) {
                  phone =
                    cleaned.length > 20 ? cleaned.substring(0, 20) : cleaned;
                  break;
                }
              }
            }

            if (!phone) return null;

            const avatarUrl: string | undefined = undefined;
            return { name, phone, avatarUrl };
          } catch (err) {
            logger.warn(
              '[Contact validation] Skipping contact due to error:',
              err,
            );
            return null;
          }
        })
        .filter(Boolean) as Array<{
        name: string;
        phone: string;
        avatarUrl?: string;
      }>;

      if (contactsPayload.length === 0) {
        Alert.alert(
          'Nothing to import',
          'No contacts with phone numbers found.',
        );
        return;
      }

      // Відправляємо контакти частинами
      const MAX_CONTACTS_PER_BATCH = 500;
      const batches: Array<
        Array<{ name: string; phone: string; avatarUrl?: string }>
      > = [];

      for (let i = 0; i < contactsPayload.length; i += MAX_CONTACTS_PER_BATCH) {
        batches.push(contactsPayload.slice(i, i + MAX_CONTACTS_PER_BATCH));
      }

      try {
        let allImported: any[] = [];

        for (let i = 0; i < batches.length; i++) {
          logger.debug(
            `[Contacts] Importing batch ${i + 1}/${batches.length} (${
              batches[i].length
            } contacts)`,
          );

          try {
            const payload = { contacts: batches[i] } as any;

            const imported = await importContacts(payload);

            if (imported && Array.isArray(imported)) {
              allImported = allImported.concat(imported);
            }
          } catch (batchError: any) {
            logger.warn(
              `[Contacts] Batch ${i + 1} failed:`,
              batchError?.message,
            );
          }
        }

        if (!allImported || allImported.length === 0) {
          Alert.alert(
            'Server returned no data',
            'The server did not return any contacts. Using your phone contacts instead.',
          );
          const localContacts = friends.map((f: any) => ({
            ...f,
            exists: false,
            status: 'PENDING',
          }));

          setImportedContacts(localContacts);
          return;
        }

        const withThumbs = (allImported || []).map((imp: any) => {
          try {
            const impPhone = String(imp.phone || imp?.phoneNumber || '').trim();
            const cleanedImpPhone = cleanPhone(impPhone);
            const match = (friends || []).find((f: any) => {
              if (!Array.isArray(f.phoneNumbers)) return false;
              return f.phoneNumbers.some((p: any) => {
                const num = String(p?.number || '').trim();
                return cleanPhone(num) === cleanedImpPhone;
              });
            });

            if (match) {
              return { ...imp, thumbnailPath: match.thumbnailPath || null };
            }
          } catch (e) {}
          return { ...imp, thumbnailPath: null };
        });

        setImportedContacts(withThumbs);
        logger.debug('[Contacts] imported total:', withThumbs.length);
      } catch (backendError: any) {
        logger.warn(
          '[Contacts] Backend error, using local contacts fallback',
          backendError?.response ?? backendError,
        );

        let errorDetails = '';
        errorDetails += `Status: ${backendError?.response?.status || 'N/A'}\n`;
        errorDetails += `Message: ${backendError?.message || 'N/A'}\n`;
        errorDetails += `Data: ${safeStringify(
          backendError?.response?.data || {},
        )}\n`;
        errorDetails += `URL: ${backendError?.config?.url || 'N/A'}`;

        Alert.alert('Server error', errorDetails);
        const localContacts = friends.map((f: any) => ({
          ...f,
          exists: false,
          status: 'PENDING',
        }));
        setImportedContacts(localContacts);
      }
    } catch (e: any) {
      logger.warn('[Contacts] import error', e?.response ?? e);

      let errorMsg = '';
      errorMsg += `Type: ${e?.name || 'Unknown'}\n`;
      errorMsg += `Message: ${e?.message || 'N/A'}\n`;
      if (e?.response) {
        errorMsg += `Status: ${e?.response?.status || 'N/A'}\n`;
        errorMsg += `Data: ${safeStringify(e?.response?.data || {})}\n`;
      }
      errorMsg += `Stack: ${e?.stack?.substring(0, 200) || 'N/A'}`;

      Alert.alert('Error', errorMsg);
    } finally {
      setLoadingImport(false);
    }
  }, [handleImportContacts]);

  useEffect(() => {
    handleImportContactsToDB();
  }, [handleImportContactsToDB, myUserId]);

  const handleShare = async () => {
    try {
      if (!myUserId) {
        await Share.share({ message: 'Join to me' });
        return;
      }

      const deepLink = getInviteUrl();
      const message =
        Platform.OS === 'android'
          ? `Join me on Example! ${deepLink}`
          : 'Join me on Example!';

      await Share.share({ message, url: deepLink });
    } catch (error) {
      logger.warn('[AddNewFriendScreen] share invite failed', error);
    }
  };

  const getInviteUrl = () => {
    if (!myUserId) return '';
    return buildInviteLink(myUserId);
  };

  const copyInvite = async () => {
    try {
      const url = getInviteUrl() || 'Join to me';
      try {
        Clipboard.setString(url);
        Alert.alert('Copied', 'Invite link copied to clipboard.');
        return;
      } catch (e) {
        logger.warn('Clipboard module not available, falling back to Share', e);
      }

      await Share.share({ message: url });
    } catch (error) {
      logger.warn('[AddNewFriendScreen] copy/share invite failed', error);
      Alert.alert('Error', 'Unable to copy or share the invite link.');
    }
  };

  const addToFriend = async (contact: any) => {
    try {
      const name = normalizeContactName(contact?.name || contact?.displayName);
      let phoneRaw: string | undefined = contact?.phone || contact?.phoneNumber;
      if (!phoneRaw && Array.isArray(contact?.phoneNumbers)) {
        phoneRaw = String(contact.phoneNumbers[0]?.number || '').trim();
      }
      if (!phoneRaw) {
        Alert.alert('Missing phone', 'This contact has no phone number.');
        return;
      }

      const phone = cleanPhone(String(phoneRaw));

      const fd = new FormData();
      fd.append('name', name);
      fd.append('phone', phone);

      // if (contact?.avatarUrl && String(contact.avatarUrl).startsWith('http')) {
      //   fd.append('avatarUrl', String(contact.avatarUrl));
      // }
      // else if (contact?.thumbnailPath) {
      //   const uri = contact.thumbnailPath;
      //   const filename = uri.split('/').pop() || 'avatar.jpg';
      //   const ext = filename.split('.').pop() || 'jpg';
      //   const type = ext === 'png' ? 'image/png' : 'image/jpeg';
      //   fd.append('avatar', { uri, name: filename, type } as any);
      // }

      setLoadingImport(true);
      await createFriend(fd as any);

      // Refresh friends list in react-query cache
      queryClient.invalidateQueries({ queryKey: ['friends'] });

      // Optionally reflect locally: mark this contact as existing
      try {
        setImportedContacts(prev =>
          prev.map(c => {
            const cPhone = cleanPhone(
              String(
                c?.phone ||
                  c?.phoneNumber ||
                  (Array.isArray(c?.phoneNumbers)
                    ? c.phoneNumbers[0]?.number
                    : '') ||
                  '',
              ),
            );
            return cPhone === phone ? { ...c, exists: true } : c;
          }),
        );
      } catch {}

      Alert.alert('Friend added', `${name} added successfully.`);
    } catch (e: any) {
      logger.error('[createFriend] error', e?.response ?? e);
      const msg =
        e?.response?.data?.message || e?.message || 'Failed to add friend';
      logger.error('[createFriend] message', msg);

      Alert.alert('Error1', msg);
    } finally {
      setLoadingImport(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const normalizedQuery = searchText.trim().toLowerCase();
    const source = normalizedQuery
      ? importedContacts.filter(f => {
          const name = (f.name || f.displayName || '').toLowerCase();
          if (name.includes(normalizedQuery)) return true;

          if (Array.isArray(f.phoneNumbers)) {
            for (const p of f.phoneNumbers) {
              const num = String(p?.number || '').toLowerCase();
              if (num.includes(normalizedQuery)) return true;
            }
          }

          if (Array.isArray(f.emails)) {
            for (const e of f.emails) {
              const addr = String(e?.email || e?.address || '').toLowerCase();
              if (addr.includes(normalizedQuery)) return true;
            }
          }

          return false;
        })
      : importedContacts;

    return [...source].sort((a, b) => {
      const nameA = (a.name || a.displayName || '').toLowerCase();
      const nameB = (b.name || b.displayName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [importedContacts, searchText]);

  const keyExtractor = useCallback(
    (item: any, index: number) => item.recordID ?? String(index),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ContactRow item={item} onAdd={addToFriend} onInvite={handleShare} />
    ),
    [addToFriend, handleShare],
  );

  const renderEmpty = useCallback(
    () => (
      <View className="items-center flex-1 justify-center">
        {loadingImport ? (
          <LoaderModal isVisible={loadingImport} />
        ) : (
          <Text className="text-textGray font-regular text-center max-w-[286px]">
            {searchText ? 'No contacts match your search.' : 'No friends yet.'}
          </Text>
        )}
      </View>
    ),
    [loadingImport, searchText],
  );

  return (
    <View className="flex-1 px-4 pt-4">
      <View className={`w-full relative `}>
        <View
          className="absolute right-4 z-10"
          style={{ top: '50%', transform: [{ translateY: -12 }] }}
        >
          <SearchWhiteIcon />
        </View>
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            borderRadius: 12,
            height: 40,
          }}
        />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          style={{
            height: 40,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'android' ? 10 : 14,
          }}
          className={`w-full rounded-2xl text-[15px] font-regular pl-4 pr-12 text-white bg-white06Color`}
          placeholder={'Search'}
          placeholderTextColor="rgba(255, 255, 255, 0.2)"
          returnKeyType={'search'}
        />
      </View>
      <LinearGradient
        colors={['#E92F80', '#F1679B']}
        className="rounded-2xl border w-44 h-10 mt-4 mb-3 self-center"
        style={{
          borderColor: 'rgba(1, 1, 1, 1)',
          shadowColor: 'rgba(0,0,0,0.35)',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-1 items-center justify-center"
          onPress={() => {
            copyInvite();
          }}
        >
          <Text className={`font-semibold text-[17px] text-white text-center`}>
            Copy Invite Link
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={filteredContacts}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ marginBottom: 10, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={8}
        removeClippedSubviews
      />
    </View>
  );
};
