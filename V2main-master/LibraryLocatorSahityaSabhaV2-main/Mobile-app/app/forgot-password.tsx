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
import { useRouter } from "expo-router";
import { apiFetch } from "../services/api";

const { width, height } = Dimensions.get("window");

export default function ForgotPassword() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
  }, [cardOpacity, cardSlide]);

  const handleSendOTP = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter your email address");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await apiFetch("/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: cleanEmail
        })
      });

      const data = (res.data ?? {}) as { success?: boolean; message?: string };

      if (res.status === 404) {
        setError("Email not found");
        return;
      }

      if (res.status === 400) {
        setError("Invalid email address");
        return;
      }

      if (!res.ok) {
        setError("Server error. Try again later.");
        return;
      }

      if (data.success) {
        setMessage("OTP sent successfully");

        setTimeout(() => {
          router.push({
            pathname: "/reset-password",
            params: { email: cleanEmail }
          });
        }, 800);
        return;
      }

      setError(data.message || "Unable to send OTP");
    } catch (err: any) {
      if (err?.message === "UNAUTHORIZED") {
        setError("Session expired. Please log in again.");
        return;
      }

      if (err?.message === "SESSION_EXPIRED") {
        setError("Session expired. Please log in again.");
        return;
      }

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
            Reset Password
          </Text>

          <Text style={styles.subtitle}>
            Enter your registered email
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError("");
              setMessage("");
            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            autoCapitalize="none"
            keyboardType="email-address"
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
            onPress={handleSendOTP}
            style={styles.button}
            buttonColor="#00796b"
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : "Send OTP"}
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
