import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthLayout } from '@components/AuthLayout';
import { AddMoreInfoScreen } from '@screens/authorization/AddMoreInfoScreen';
import CreateNewPasswordScreen from '@screens/authorization/CreateNewPasswordScreen';
import LoginScreen from '@screens/authorization/LoginScreen';
import { SignUpScreen } from '@screens/authorization/SignUpScreen';

const Stack = createNativeStackNavigator();

export const AuthNavigation = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'simple_push',
      }}
    >
      <Stack.Screen
        name="LoginScreen"
        children={() => (
          <AuthLayout>
            <LoginScreen />
          </AuthLayout>
        )}
      />
      <Stack.Screen
        name="SignUpScreen"
        children={() => (
          <AuthLayout>
            <SignUpScreen />
          </AuthLayout>
        )}
      />
      <Stack.Screen
        name="CreateNewPasswordScreen"
        children={() => (
          <AuthLayout>
            <CreateNewPasswordScreen />
          </AuthLayout>
        )}
      />
      <Stack.Screen
        name="AddMoreInfoScreen"
        children={() => (
          <AuthLayout>
            <AddMoreInfoScreen />
          </AuthLayout>
        )}
      />
    </Stack.Navigator>
  );
};
