import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyTabs from './MyTabs';
import { AlarmNavigation } from './AlarmNavigation';
import { AuthNavigation } from './AuthNavigation';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { View, ActivityIndicator } from 'react-native';
import { AlarmActivityScreen } from '@screens/AlarmActivityScreen';
import { MainContentNavigation } from './MainContentNavigation';
import { ShareAlarmScreen } from '@screens/ShareAlarmScreen';

const Stack = createNativeStackNavigator();

export const MainNavigation = () => {
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const isAuthenticated = Boolean(accessToken);

  if (accessToken === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? 'app-stack' : 'auth-stack'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'simple_push',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MyTabs" component={MyTabs} />
          <Stack.Screen name="AlarmNavigation" component={AlarmNavigation} />
          <Stack.Screen
            name="MainContentNavigation"
            component={MainContentNavigation}
          />
          <Stack.Screen
            name="AlarmActivityScreen"
            component={AlarmActivityScreen}
            options={{
              animation: 'simple_push',
              contentStyle: { backgroundColor: '#3C1053' },
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="ShareAlarmScreen"
            component={ShareAlarmScreen}
            options={{
              animation: 'simple_push',
              animationTypeForReplace: 'push',
              contentStyle: { backgroundColor: '#3C1053' },
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
            }}
          />
        </>
      ) : (
        <Stack.Screen name="AuthNavigation" component={AuthNavigation} />
      )}
    </Stack.Navigator>
  );
};
