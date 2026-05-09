import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Animated,
  ActivityIndicator
} from "react-native";

import { TextInput, Button } from "react-native-paper";
import { useRouter } from "expo-router";

import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

export default function ChangePassword() {
  const router = useRouter();
  const { token, isLoading } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [token, isLoading, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, [cardOpacity, cardSlide]);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  const handleChangePassword = async () => {
    const cleanOldPassword = oldPassword.trim();
    const cleanNewPassword = newPassword.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanOldPassword || !cleanNewPassword || !cleanConfirmPassword) {
      setError("Fill all fields");
      return;
    }

    if (cleanNewPassword !== cleanConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!passwordRegex.test(cleanNewPassword)) {
      setError(
        "Password must contain 8+ characters, uppercase, lowercase, number and symbol"
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiFetch("/change-password", {
        method: "POST",
        body: JSON.stringify({
          oldPassword: cleanOldPassword,
          newPassword: cleanNewPassword
        })
      });

      const data = (res.data ?? {}) as { success?: boolean; message?: string };

      if (res.status === 401) {
        setError(data.message || "Incorrect old password");
        return;
      }

      if (res.status === 400) {
        setError(data.message || "Invalid password request");
        return;
      }

      if (!res.ok) {
        setError(data.message || "Server error. Try again later.");
        return;
      }

      if (data.success) {
        setSuccess("Password updated successfully ✅");
        setTimeout(() => {
          router.back();
        }, 1200);
      } else {
        setError(data.message || "Could not update password");
      }
    } catch (err: any) {
      setError(
        err?.message === "UNAUTHORIZED"
          ? "Session expired. Please log in again."
          : "Server connection failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/books-bg.jpeg")}
      style={styles.background}
    >
      <View style={styles.overlay} />

      <View style={styles.centered}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardSlide }]
            }
          ]}
        >
          <Text style={styles.title}>Change Password</Text>

          <TextInput
            label="Old Password"
            secureTextEntry
            value={oldPassword}
            onChangeText={(t) => {
              setOldPassword(t);
              setError("");
              setSuccess("");
            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            theme={inputTheme}
          />

          <TextInput
            label="New Password"
            secureTextEntry
            value={newPassword}
            onChangeText={(t) => {
              setNewPassword(t);
              setError("");
              setSuccess("");
            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            theme={inputTheme}
          />

          <TextInput
            label="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              setError("");
              setSuccess("");
            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            theme={inputTheme}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Button
            mode="contained"
            onPress={handleChangePassword}
            style={styles.button}
            buttonColor="#00796b"
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : "Update Password"}
          </Button>
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
    onSurfaceVariant: "rgba(255,255,255,0.6)"
  }
};

const styles = StyleSheet.create({
  background: {
    width,
    height
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(8,18,28,0.72)",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 24
  },
  input: {
    marginBottom: 14
  },
  error: {
    color: "#ff7b7b",
    textAlign: "center",
    marginBottom: 12
  },
  success: {
    color: "#4db6ac",
    textAlign: "center",
    marginBottom: 12
  },
  button: {
    borderRadius: 12
  }
});
