import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_STORAGE_KEY = "auth_token";

async function setNativeToken(token: string) {
  try {
    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, token);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
    return;
  } catch {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, token);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(AUTH_STORAGE_KEY);
  }

  try {
    const secureToken = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
    if (secureToken) {
      return secureToken;
    }
  } catch {
    // Fall through to AsyncStorage migration.
  }

  const fallbackToken = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!fallbackToken) {
    return null;
  }

  try {
    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, fallbackToken);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
  } catch {
    // Keep the fallback token if SecureStore is temporarily unavailable.
  }

  return fallbackToken;
}

export async function setAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, token);
    return;
  }

  await setNativeToken(token);
}

export async function removeAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
  } finally {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
  }
}
