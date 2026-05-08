import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Layout } from '../components/Layout';
import { AlarmScreen } from '@screens/previewAlarms/AlarmScreen';
import { EditAlarmScreen } from '@screens/previewAlarms/EditAlarmScreen';
import { PreviewAlarmScreen } from '@screens/previewAlarms/PreviewAlarmScreen';

const Stack = createNativeStackNavigator();

export const AlarmNavigation = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'simple_push',
      }}
    >
      <Stack.Screen
        name="AlarmScreen"
        // options={{ animation: 'fade' }}
        children={() => (
          <Layout isNotification={false} isBack={true}>
            <AlarmScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="EditAlarmScreen"
        // options={{ animation: 'fade' }}
        children={() => (
          <Layout isNotification={false} isBack={false}>
            <EditAlarmScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="PreviewAlarmScreen"
        // options={{ animation: 'fade' }}
        children={() => (
          <Layout isNotification={false} isBack={true}>
            <PreviewAlarmScreen />
          </Layout>
        )}
      />
    </Stack.Navigator>
  );
};
