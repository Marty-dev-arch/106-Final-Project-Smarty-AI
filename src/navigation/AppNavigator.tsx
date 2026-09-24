import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

// Import all 19 screens
import Welcome from "../screens/Welcome";
import SignIn from "../screens/SignIn";
import SignUp from "../screens/SignUp";
import MainOnboard1 from "../screens/MainOnboard1";
import MainOnboard2 from "../screens/MainOnboard2";
import MainOnboard3 from "../screens/MainOnboard3";
import MainOnboard4 from "../screens/MainOnboard4";
import Dashboard from "../screens/Dashboard";
import UploadQuiz from "../screens/UploadQuiz";
import QuizTaking from "../screens/QuizTaking";
import QuizSummary from "../screens/QuizSummary";
import Results from "../screens/Results";
import QuizHistoryDiagnostics from "../screens/QuizHistoryDiagnostics";
import MistakeBank from "../screens/MistakeBank";
import MyQuizzes from "../screens/MyQuizzes";
import Achievements from "../screens/Achievements";
import MedalDetails from "../screens/MedalDetails";
import Performance from "../screens/Performance";
import ProfileSetiing from "../screens/ProfileSetiing";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainOnboard1"
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
      }}
    >
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="MainOnboard1" component={MainOnboard1} />
      <Stack.Screen name="MainOnboard2" component={MainOnboard2} />
      <Stack.Screen name="MainOnboard3" component={MainOnboard3} />
      <Stack.Screen name="MainOnboard4" component={MainOnboard4} />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="UploadQuiz" component={UploadQuiz} />
      <Stack.Screen name="QuizTaking" component={QuizTaking} />
      <Stack.Screen name="QuizSummary" component={QuizSummary} />
      <Stack.Screen name="Results" component={Results} />
      <Stack.Screen name="QuizHistoryDiagnostics" component={QuizHistoryDiagnostics} />
      <Stack.Screen name="MistakeBank" component={MistakeBank} />
      <Stack.Screen name="MyQuizzes" component={MyQuizzes} />
      <Stack.Screen name="Achievements" component={Achievements} />
      <Stack.Screen name="MedalDetails" component={MedalDetails} />
      <Stack.Screen name="Performance" component={Performance} />
      <Stack.Screen name="ProfileSetiing" component={ProfileSetiing} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
