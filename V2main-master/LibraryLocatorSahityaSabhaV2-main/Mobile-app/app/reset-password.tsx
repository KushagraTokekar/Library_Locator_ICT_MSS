import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Animated,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";

import { TextInput, Button } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiFetch } from "../services/api";

const { width, height } = Dimensions.get("window");

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default function ResetPassword() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string | string[] }>();

  const normalizedEmail = getSingleParam(email);

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

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
  }, []);

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  const handleResetPassword = async () => {
    const cleanOtp = otp.trim();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!normalizedEmail) {
      setError("Missing email");
      return;
    }

    if (!cleanOtp || !cleanPassword || !cleanConfirm) {
      setError("Please fill all fields");
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setError("Passwords do not match");
      return;
    }

    if (!passwordRegex.test(cleanPassword)) {
      setError(
        "Password must contain 8+ characters, uppercase, lowercase, number and symbol"
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await apiFetch("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          otp: cleanOtp,
          newPassword: cleanPassword
        })
      });

      const data = res.data as
        | { success?: boolean; message?: string }
        | null
        | undefined;

      if (res.status === 401) {
        setError("Incorrect OTP");
        return;
      }

      if (res.status === 403) {
        setError("Too many attempts. Request new OTP.");
        return;
      }

      if (res.status === 410) {
        setError("OTP expired. Request new OTP.");
        return;
      }

      if (res.status === 404) {
        setError("User not found.");
        return;
      }

      if (!res.ok) {
        setError((data && data.message) || "Server error. Try again later.");
        return;
      }

      if (data?.success) {
        setMessage("Password reset successful");

        setTimeout(() => {
          router.replace("/login");
        }, 1200);
        return;
      }

      setError((data && data.message) || "Unable to reset password");
    } catch {
      setError("Unable to contact server");
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
              transform: [{ translateY: cardSlide }]
            }
          ]}
        >
          <Text style={styles.title}>
            Enter Reset Code
          </Text>

          <Text style={styles.subtitle}>
            Check your email for OTP
          </Text>

          <TextInput
            label="OTP"
            value={otp}
            onChangeText={(t) => {
              setOtp(t);
              setError("");
              setMessage("");
            }}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            textColor="white"
            theme={inputTheme}
          />

          <TextInput
            label="New Password"
            secureTextEntry
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError("");
              setMessage("");
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
              setMessage("");
            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            theme={inputTheme}
          />

          {message ? (
            <Text style={styles.success}>
              {message}
            </Text>
          ) : null}

          {error ? (
            <Text style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleResetPassword}
            style={styles.button}
            buttonColor="#00796b"
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : "Reset Password"}
          </Button>

          <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={{ marginTop: 16 }}
          >
            <Text style={styles.link}>
              Back to login
            </Text>
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
    onSurfaceVariant: "rgba(255,255,255,0.6)"
  }
};

const styles = StyleSheet.create({
  background: { width, height },

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
    marginBottom: 6
  },

  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginBottom: 24
  },

  input: { marginBottom: 14 },

  success: {
    color: "#4db6ac",
    textAlign: "center",
    marginBottom: 12
  },

  error: {
    color: "#ff7b7b",
    textAlign: "center",
    marginBottom: 12
  },

  button: {
    marginTop: 4,
    borderRadius: 12
  },

  link: {
    textAlign: "center",
    color: "#4db6ac"
  }
});
