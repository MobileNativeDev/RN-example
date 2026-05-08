import { Text, View, ScrollView } from 'react-native';
import React from 'react';

export const LegalNote = () => {
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} style={{ flex: 1 }}>
      <View>
        <Text
          className='font-regular'
          style={{
            color: 'white',
            fontSize: 14,
            lineHeight: 22,
            marginBottom: 12,
          }}
        >
          Privacy Policy
        </Text>

        <Text
          className='font-regular'
          style={{
            color: 'white',
            fontSize: 14,
            lineHeight: 22,
            marginBottom: 12,
          }}
        >
          This privacy policy applies to the WAKKAP app (hereby referred to as
          "Application") for mobile devices that was created by WAKKAP (hereby
          referred to as "Service Provider") as a Free service. This service is
          intended for use "AS IS".
        </Text>

        <Text
          className='font-regular'
          style={{
            color: 'white',
            fontSize: 14,
            lineHeight: 22,
            marginBottom: 12,
          }}
        >
          Information Collection and Use
        </Text>

        <Text
          className='font-regular'
          style={{
            color: 'white',
            fontSize: 14,
            lineHeight: 22,
            marginBottom: 12,
          }}
        >
          The Application collects information when you download and use it.
          This information may include information such as your device's
          Internet Protocol address (e.g. IP address), the pages of the
          Application that you visit, the time and date of your visit, the time
          spent on those pages, the time spent on the Application, and the
          operating system you use on your mobile device. The Application does
          not gather precise information about the location of your mobile
          device.
        </Text>

        <Text
          className='font-regular'
          style={{
            color: 'white',
            fontSize: 14,
            lineHeight: 22,
            marginBottom: 12,
          }}
        >
          The Service Provider may use the information you provided to contact
          you from time to time to provide you with important information.
        </Text>
      </View>
    </ScrollView>
  );
};
