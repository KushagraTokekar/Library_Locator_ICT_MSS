import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import { TextInput, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

export default function Login() {

  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const passwordRef = useRef<any>(null);

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

  }, []);


  const shake = () => {

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();

  };


  const handleLogin = async () => {

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {

      setError("Please enter email and password.");
      shake();
      return;

    }

    setLoading(true);
    setError("");

    try {

      const res = await apiFetch("/login", {

        method: "POST",

        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),

      });

      const data: any = res.data ?? {};


      if (res.status === 403 || data.message === "Verify email first") {

        setError("Please verify your email before logging in.");
        shake();
        return;

      }

      if (res.status === 423 || res.status === 429 || data.message === "Account locked") {

        setError("Too many failed login attempts. Try again later.");
        shake();
        return;

      }

      if (res.status === 401) {

        setError("Invalid email or password.");
        shake();
        return;

      }

      if (!res.ok) {

        setError("Server error. Please try again later.");
        shake();
        return;

      }


      if (data.success && data.token) {

        await login(data.token);

        setTimeout(() => {

          router.replace("/(tabs)/home");

        }, 50);

      } else {

        setError("Login failed. Try again.");
        shake();

      }

    } catch {

      setError("Unable to reach server. Check internet connection.");
      shake();

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
              transform: [
                { translateY: cardSlide },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >

          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>📚</Text>
            </View>
          </View>

          <Text style={styles.title}>Library Locator</Text>
          <Text style={styles.subtitle}>SAHITYA SABHA</Text>


          <TextInput
            label="Email"
            value={email}
            onChangeText={(t) => {

              setEmail(t);
              setError("");

            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            left={
              <TextInput.Icon
                icon="email-outline"
                color="rgba(255,255,255,0.6)"
              />
            }
            theme={inputTheme}
          />


          <TextInput
            ref={passwordRef}
            label="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(t) => {

              setPassword(t);
              setError("");

            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            left={
              <TextInput.Icon
                icon="lock-outline"
                color="rgba(255,255,255,0.6)"
              />
            }
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off-outline" : "eye-outline"}
                color="rgba(255,255,255,0.6)"
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            theme={inputTheme}
          />


          <TouchableOpacity
            onPress={() => router.push("/forgot-password")}
          >
            <Text style={styles.forgot}>
              Forgot password?
            </Text>
          </TouchableOpacity>


          {error ? (

            <View style={styles.errorRow}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.error}>{error}</Text>
            </View>

          ) : null}


          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="#00796b"
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" size="small" />
              : "Sign In"}
          </Button>


          <TouchableOpacity
            onPress={() => router.push("/signup")}
            style={{ marginTop: 16 }}
          >
            <Text style={styles.signup}>
              Create new account
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
    onSurfaceVariant: "rgba(255,255,255,0.6)",
  }

};


const styles = StyleSheet.create({

  background: { width, height },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 60,
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

  logoRow: { alignItems: "center", marginBottom: 12 },

  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,121,107,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(77,182,172,0.4)",
  },

  logoIcon: { fontSize: 30 },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 28,
  },

  input: {
    width: "100%",
    marginBottom: 14,
  },

  forgot: {
    color: "#4db6ac",
    textAlign: "right",
    marginBottom: 12,
    fontSize: 13,
  },

  signup: {
    textAlign: "center",
    color: "#4db6ac",
    fontSize: 14,
    fontWeight: "500",
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "rgba(229,57,53,0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.3)",
  },

  errorIcon: {
    color: "#ff7b7b",
    marginRight: 6,
    fontSize: 13,
  },

  error: {
    color: "#ff7b7b",
    fontSize: 13,
    flex: 1,
  },

  button: {
    marginTop: 4,
    borderRadius: 12,
  },

  buttonContent: {
    paddingVertical: 6,
  },

});