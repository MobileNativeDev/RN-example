import React, { useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Arrow from '../../../assets/svg/Arrow.svg';

const QUESTIONS = [
  {
    id: 'q1',
    title: 'Question 1 ?',
    body: 'This privacy policy applies to the WAKKAP app (hereby referred to as "Application") for mobile devices that was created by WAKKAP (hereby referred to as "Service Provider") as a Free service. This service is intended for use "AS IS".',
  },
  { id: 'q2', title: 'Question 2 ?', body: 'Answer to question 2...' },
  { id: 'q3', title: 'Question 3 ?', body: 'Answer to question 3...' },
  { id: 'q4', title: 'Question 4 ?', body: 'Answer to question 4...' },
  { id: 'q5', title: 'Question 5 ?', body: 'Answer to question 5...' },
  { id: 'q6', title: 'Question 6 ?', body: 'Answer to question 6...' },
  { id: 'q7', title: 'Question 7 ?', body: 'Answer to question 7...' },
];

const HelpQuestionItem = ({
  body,
  isOpen,
  onToggle,
  title,
}: {
  body: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) => {
  return (
    <View className="mb-2">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onToggle}
        className={`flex-row items-center py-3 ${
          !isOpen && 'border-b border-white'
        }`}
      >
        <View className="flex-1">
          <Text className="text-white text-base font-regular">{title}</Text>
        </View>
        <View
          style={[
            styles.arrowContainer,
            { transform: [{ rotate: isOpen ? '270deg' : '90deg' }] },
          ]}
        >
          <Arrow width={12} height={13} />
        </View>
      </TouchableOpacity>
      <View className="h-px bg-white/12" />
      {isOpen && (
        <View className="py-3 border-b border-white">
          <Text className="text-white leading-6 font-regular">{body}</Text>
          <View className="h-px bg-white/12 mt-3" />
        </View>
      )}
    </View>
  );
};

export const Help = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
    >
      {QUESTIONS.map(item => (
        <HelpQuestionItem
          key={item.id}
          body={item.body}
          isOpen={openId === item.id}
          onToggle={() => toggle(item.id)}
          title={item.title}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  arrowContainer: {
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 20,
  },
});
