import { useState, useEffect, useRef } from "react";
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

function getEmailParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function VerifyEmail() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string | string[] }>();
  const emailValue = getEmailParam(email);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [seconds, setSeconds] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resending, setResending] = useState(false);

  const [verified, setVerified] = useState(false);

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!emailValue) {
      router.replace("/signup");
      return;
    }

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
  }, [cardOpacity, cardSlide, emailValue, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace("/signup");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (!emailValue) {
      setError("Missing email. Please sign up again.");
      return;
    }

    if (!otp.trim()) {
      setError("Enter OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email: emailValue,
          otp
        })
      });

      const data = await res.data;

      if (res.status === 410) {
        router.replace("/signup");
        return;
      }

      if (res.status === 400) {
        setError("Email already verified. Please login.");
        return;
      }

      if (res.status === 401) {
        setError("Incorrect OTP");
        return;
      }

      if (res.status === 403) {
        setError("Too many attempts. Request new OTP.");
        return;
      }

      if (!res.ok) {
        setError("Verification failed. Try again.");
        return;
      }

      if (data?.success) {
        setVerified(true);
        setTimeout(() => {
          router.replace("/login");
        }, 2000);
      } else {
        setError(data?.message ?? "Verification failed. Try again.");
      }
    } catch {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || !emailValue) return;

    setResending(true);
    setError("");

    try {
      const res = await apiFetch("/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: emailValue })
      });

      const data = await res.data;

      if (res.status === 404) {
        setError("User not found.");
        return;
      }

      if (res.status === 400) {
        setError("Email already verified.");
        return;
      }

      if (!res.ok) {
        setError(data?.message ?? "Unable to resend OTP.");
        return;
      }

      setResendCooldown(30);
      setSeconds(300);
      setError("");
    } catch {
      setError("Server error while resending");
    } finally {
      setResending(false);
    }
  };

  const formatTime = () => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (verified) {
    return (
      <ImageBackground
        source={require("../assets/images/books-bg.jpeg")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.centered}>
          <View style={styles.card}>
            <Text style={styles.successTitle}>Email Verified ✅</Text>
            <Text style={styles.subtitle}>Redirecting to login...</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

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
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>OTP sent to</Text>
          <Text style={styles.email}>{emailValue}</Text>

          <TextInput
            label="Enter OTP"
            value={otp}
            onChangeText={(t) => {
              setOtp(t);
              setError("");
            }}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            textColor="white"
            theme={inputTheme}
          />

          <Text style={styles.timer}>Expires in {formatTime()}</Text>

          <TouchableOpacity onPress={handleResendOTP} disabled={resending}>
            <Text style={styles.resend}>
              {resendCooldown > 0
                ? `Resend OTP in ${resendCooldown}s`
                : resending
                  ? "Sending..."
                  : "Resend OTP"}
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            mode="contained"
            onPress={handleVerify}
            style={styles.button}
            buttonColor="#00796b"
            disabled={loading || !emailValue}
          >
            {loading ? <ActivityIndicator color="white" /> : "Verify OTP"}
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
    marginBottom: 10
  },
  subtitle: {
    textAlign: "center",
    color: "#bbb"
  },
  email: {
    textAlign: "center",
    color: "#4db6ac",
    marginBottom: 20
  },
  input: { marginBottom: 12 },
  timer: {
    textAlign: "center",
    color: "#aaa",
    marginBottom: 6
  },
  resend: {
    textAlign: "center",
    color: "#4db6ac",
    marginBottom: 10
  },
  error: {
    color: "#ff7b7b",
    marginBottom: 10,
    textAlign: "center"
  },
  button: {
    marginTop: 4,
    borderRadius: 12
  },
  successTitle: {
    fontSize: 26,
    color: "#4db6ac",
    textAlign: "center",
    marginBottom: 10
  }
});
