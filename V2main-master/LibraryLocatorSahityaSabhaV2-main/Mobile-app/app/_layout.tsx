import { Stack } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {

  return (

    <ThemeProvider>

      <AuthProvider>

        <Stack screenOptions={{ headerShown: false }}>

          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="change-password" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="(tabs)" />

        </Stack>

      </AuthProvider>

    </ThemeProvider>

  );

}