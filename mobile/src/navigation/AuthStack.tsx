import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RegisterSuccessScreen from '../screens/RegisterSuccessScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RegisterSuccess: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack({ onLoggedIn }: { onLoggedIn: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoggedIn={onLoggedIn} />}
      </Stack.Screen>
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="RegisterSuccess" component={RegisterSuccessScreen} />
    </Stack.Navigator>
  );
}
