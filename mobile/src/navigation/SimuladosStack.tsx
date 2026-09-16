import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SimuladosScreen from '../screens/SimuladosScreen';
import SimuladoQuestionScreen from '../screens/SimuladoQuestionScreen';
import SimuladoResultScreen from '../screens/SimuladoResultScreen';

export type SimuladosStackParamList = {
  SimuladosList: undefined;
  SimuladoQuestion: { simuladoId: number };
  SimuladoResult: { simuladoId: number };
};

const Stack = createNativeStackNavigator<SimuladosStackParamList>();

export default function SimuladosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SimuladosList" component={SimuladosScreen} />
      <Stack.Screen name="SimuladoQuestion" component={SimuladoQuestionScreen} />
      <Stack.Screen name="SimuladoResult" component={SimuladoResultScreen} />
    </Stack.Navigator>
  );
}
