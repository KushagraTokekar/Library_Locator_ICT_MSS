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

export default function Signup() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
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

  }, []);


  // Backend-compatible password validation

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;


  const handleSignup = async () => {

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanEmail || !cleanPassword || !cleanConfirm) {

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

    try {

      const res = await apiFetch("/signup", {

        method: "POST",

        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword
        })

      });

      const data = res.data;


      // STATUS-BASED HANDLING

      if (res.status === 409) {

        setError("Email already registered.");
        return;

      }

      if (res.status === 400) {

        setError("Invalid email or password format.");
        return;

      }

      if (!res.ok) {

        setError("Server error. Try again later.");
        return;

      }


      if (data.success) {

        router.push({
          pathname: "/verify-email",
          params: { email: cleanEmail }
        });

      } else {

        setError("Signup failed. Try again.");

      }

    } catch {

      setError("Cannot connect to server");

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
            Create Account
          </Text>


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
            autoCapitalize="none"
            keyboardType="email-address"
            theme={inputTheme}
          />


          <TextInput
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={(t) => {

              setPassword(t);
              setError("");

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

            }}
            style={styles.input}
            mode="outlined"
            textColor="white"
            theme={inputTheme}
          />


          {error ? (

            <Text style={styles.error}>
              {error}
            </Text>

          ) : null}


          <Button
            mode="contained"
            onPress={handleSignup}
            style={styles.button}
            buttonColor="#00796b"
            disabled={loading}
          >

            {loading
              ? <ActivityIndicator color="white" />
              : "Sign Up"}

          </Button>


          <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={{ marginTop: 16 }}
          >

            <Text style={styles.link}>
              Already have an account? Sign In
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
    marginBottom: 24
  },

  input: { marginBottom: 14 },

  error: {
    color: "#ff7b7b",
    marginBottom: 10,
    textAlign: "center"
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