import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useThemeContext } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/theme";

export default function Settings() {
  const { mode, toggleTheme } = useThemeContext();
  const { logout, user } = useAuth();

  const theme = Colors[mode];
  const router = useRouter();
  const isDark = mode === "dark";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const accountLabel = user?.email ?? "User";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      <Text style={[styles.sectionLabel, { color: theme.icon }]}>Appearance</Text>

      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons
              name={isDark ? "moon" : "sunny"}
              size={20}
              color={theme.icon}
            />
            <Text style={[styles.label, { color: theme.text }]}>Dark Mode</Text>
          </View>

          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.tint }}
            thumbColor="white"
          />
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.icon }]}>Account</Text>

      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons
              name="person-outline"
              size={20}
              color={theme.icon}
            />
            <Text style={[styles.label, { color: theme.text }]}>Logged in as</Text>
          </View>

          <Text style={[styles.valueText, { color: theme.tint }]}>
            {accountLabel}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push("/change-password")}
        >
          <View style={styles.rowLeft}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.icon}
            />
            <Text style={[styles.label, { color: theme.text }]}>Change Password</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push("/delete-account")}
        >
          <View style={styles.rowLeft}>
            <Ionicons
              name="trash-outline"
              size={20}
              color="#e74c3c"
            />
            <Text style={[styles.label, { color: "#e74c3c" }]}>Delete Account</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="white" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 16,
    paddingHorizontal: 4,
    marginBottom: 20,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    marginLeft: 12,
  },
  valueText: {
    fontSize: 14,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e74c3c",
    padding: 15,
    borderRadius: 16,
    marginTop: 8,
  },
  logoutText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 6,
  },
});
