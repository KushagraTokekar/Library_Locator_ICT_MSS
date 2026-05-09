import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,

} from "react-native";

import { TextInput, Button } from "react-native-paper";
import { useRouter } from "expo-router";

import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

type ApiResponse = {
  success?: boolean;
  message?: string;
};

export default function DeleteAccount() {
  const router = useRouter();
  const { token, isLoading, logout } = useAuth();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardSlide]);

  const confirmDelete = () => {
  if (loading) return;

  if (Platform.OS === "web") {
    const confirmed = window.confirm(
      "This action is permanent. Continue?"
    );

    if (confirmed) {
      handleDeleteAccount();
    }

    return;
  }

  Alert.alert(
    "Delete Account",
    "This action is permanent. Continue?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: handleDeleteAccount,
      },
    ]
  );
};
  const handleDeleteAccount = async () => {
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError("Enter your password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/delete-account", {
        method: "POST",
        body: JSON.stringify({
          password: cleanPassword,
        }),
      });

      const data = (res.data ?? {}) as ApiResponse;

      if (res.status === 401) {
        setError(data.message || "Incorrect password");
        return;
      }

      if (res.status === 404) {
        setError(data.message || "User not found");
        return;
      }

      if (res.status === 400) {
        setError(data.message || "Invalid password");
        return;
      }

      if (!res.ok) {
        setError(data.message || "Unable to delete account");
        return;
      }

      if (data.success) {
        await logout();
        router.replace("/login");
        return;
      }

      setError(data.message || "Unable to delete account");
    } catch (err: any) {
      if (err?.message === "SESSION_EXPIRED" || err?.message === "UNAUTHORIZED") {
        await logout();
        router.replace("/login");
        return;
      }

      if (err?.message === "API_BASE_MISSING") {
        setError("API base URL is missing");
        return;
      }

      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/books-bg.jpeg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <View style={styles.centered}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          <Text style={styles.title}>Delete Account</Text>

          <Text style={styles.warning}>
            This action cannot be undone.
          </Text>

          <TextInput
            label="Enter Password"
            secureTextEntry
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError("");
            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            autoCapitalize="none"
            theme={inputTheme}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            mode="contained"
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
            buttonColor="#d32f2f"
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : "Delete Account"}
          </Button>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          >
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const inputTheme = {
  colors: {
    background: "rgba(255,255,255,0.08)",
    outline: "rgba(255,255,255,0.25)",
    primary: "#4db6ac",
    onSurfaceVariant: "rgba(255,255,255,0.6)",
  },
};

const styles = StyleSheet.create({
  background: {
    width,
    height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(8,18,28,0.72)",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  warning: {
    textAlign: "center",
    color: "#ff7b7b",
    marginBottom: 20,
  },
  input: {
    marginBottom: 14,
  },
  deleteButton: {
    marginTop: 4,
    borderRadius: 12,
  },
  cancel: {
    textAlign: "center",
    color: "#4db6ac",
  },
  error: {
    color: "#ff7b7b",
    textAlign: "center",
    marginBottom: 10,
  },
});
