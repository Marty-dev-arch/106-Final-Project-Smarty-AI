import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { useAuth } from "../context/AuthContext";
import BrainSpinner from "../components/common/BrainSpinner";

// Import all screens
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

// Tab screens: navigator animation must be NONE so TabSlideWrapper owns the transition
const TAB_ANIMATION = { animation: "none" } as const;

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <BrainSpinner fullScreen size={72} message="Restoring session..." />;
  }

  const initialRoute = user && user.email ? "Dashboard" : "MainOnboard1";

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom", // default for non-tab screens
      }}
    >
      {/* ── Onboarding & Auth (keep default animation) ── */}
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="MainOnboard1" component={MainOnboard1} />
      <Stack.Screen name="MainOnboard2" component={MainOnboard2} />
      <Stack.Screen name="MainOnboard3" component={MainOnboard3} />
      <Stack.Screen name="MainOnboard4" component={MainOnboard4} />

      {/* ── Tab screens: NO navigator animation — TabSlideWrapper owns it ── */}
      <Stack.Screen name="Dashboard"   component={Dashboard}   options={TAB_ANIMATION} />
      <Stack.Screen name="MyQuizzes"   component={MyQuizzes}   options={TAB_ANIMATION} />
      <Stack.Screen name="UploadQuiz"  component={UploadQuiz}  options={TAB_ANIMATION} />
      <Stack.Screen name="Achievements" component={Achievements} options={TAB_ANIMATION} />
      <Stack.Screen name="Performance" component={Performance}  options={TAB_ANIMATION} />

      {/* ── Flow screens (keep default animation) ── */}
      <Stack.Screen name="QuizTaking"             component={QuizTaking} />
      <Stack.Screen name="QuizSummary"            component={QuizSummary} />
      <Stack.Screen name="Results"                component={Results} />
      <Stack.Screen name="QuizHistoryDiagnostics" component={QuizHistoryDiagnostics} />
      <Stack.Screen name="MistakeBank"            component={MistakeBank} />
      <Stack.Screen name="MedalDetails"           component={MedalDetails} />
      <Stack.Screen name="ProfileSetiing"         component={ProfileSetiing}         options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
