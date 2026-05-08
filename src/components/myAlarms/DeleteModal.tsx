import { CustomModal } from '@components/customComponents/CustomModal';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

type DeleteModalProps = {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  deleteAlarm: (alarm: any) => void;
  selectedAlarm: any;
};

export const DeleteModal = ({
  modalVisible,
  setModalVisible,
  deleteAlarm,
  selectedAlarm,
}: DeleteModalProps) => {
  const [comment, setComment] = useState<string>('');
  return (
    <CustomModal
      isVisible={modalVisible}
      onClose={() => setModalVisible(false)}
    >
      <View className="rounded-lg  pt-5">
        <View className="px-4">
          <Text className="text-black text-center font-semibold text-[17px]">
            Delete Alarm
          </Text>
          <Text className="text-black font-regular text-[13px] text-center">
            Are you sure you want to delete the alarm? This will also remove all
            media that was sent to you.
          </Text>
        </View>
        <TextInput
          className="mt-4 px-2 py-1 mx-4 border border-borderColor rounded-lg text-black font-regular text-[15px] bg-white"
          placeholder="Text something your friend"
          placeholderTextColor={'gray'}
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <View className="flex-row justify-between mt-4">
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-1 py-3 border-t border-1/3 border-borderColor"
            onPress={() => setModalVisible(false)}
          >
            <Text className="text-center text-blueColor font-regular">
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-1 py-3 border border-1/3 border-borderColor"
            onPress={() => deleteAlarm(selectedAlarm)}
          >
            <Text className="text-center text-redColor font-regular">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </CustomModal>
  );
};
