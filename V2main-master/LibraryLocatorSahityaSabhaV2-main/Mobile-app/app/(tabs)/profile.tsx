import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeContext } from "../../context/ThemeContext";
import { Colors } from "../../constants/theme";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

const getScopedKey = (baseKey: string, userId?: number | string | null) =>
  userId === null || userId === undefined
    ? `${baseKey}_guest`
    : `${baseKey}_${userId}`;

export default function Profile() {
  const { mode } = useThemeContext();
  const theme = Colors[mode];
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();
  const userId = user?.id ?? null;
  const recentKey = getScopedKey("recent_searches", userId);
  const loginTimeKey = getScopedKey("login_time", userId);

  const [searchCount, setSearchCount] = useState(0);
  const [loginTime, setLoginTime] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    if (!userId) {
      setSearchCount(0);
      setLoginTime("");
      return () => {
        mounted = false;
      };
    }

    setSearchCount(0);
    setLoginTime("");

    AsyncStorage.getItem(recentKey)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSearchCount(parsed.length);
        } catch {
          // ignore malformed cache
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(loginTimeKey)
      .then((raw) => {
        if (!mounted) return;

        if (raw) {
          const date = new Date(raw);
          if (!Number.isNaN(date.getTime())) {
            setLoginTime(date.toLocaleString());
            return;
          }
        }

        const now = new Date().toISOString();
        AsyncStorage.setItem(loginTimeKey, now).catch(() => {});
        setLoginTime(new Date(now).toLocaleString());
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [recentKey, loginTimeKey, userId]);

  const email = user?.email ?? "—";

  const roleLabel = useMemo(() => {
    if (isSuperAdmin || user?.role === "super_admin" || Number(user?.superuser) === 1) {
      return "Administrator";
    }
    return "Library User";
  }, [isSuperAdmin, user?.role, user?.superuser]);

  const tintBg =
    mode === "dark"
      ? "rgba(77,182,172,0.12)"
      : "rgba(0,121,107,0.08)";

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.pageTitle, { color: theme.text }]}>Profile</Text>

      <View style={[styles.avatarCard, { backgroundColor: theme.card }]}>
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <Ionicons name="person" size={44} color="white" />
        </View>

        <Text style={[styles.name, { color: theme.text }]}>{email}</Text>

        <Text style={[styles.role, { color: theme.icon }]}>
          {roleLabel} · Sahitya Sabha
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: tintBg }]}>
            <Text style={[styles.statNum, { color: theme.tint }]}>{searchCount}</Text>
            <Text style={[styles.statLabel, { color: theme.icon }]}>Recent Searches</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: tintBg }]}>
            <Ionicons name="checkmark-circle" size={22} color={theme.tint} />
            <Text style={[styles.statLabel, { color: theme.icon }]}>Active Session</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.icon }]}>Account Details</Text>

      <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
        {[
          { icon: "person-outline" as const, label: "Email", value: email },
          { icon: "shield-checkmark-outline" as const, label: "Role", value: roleLabel },
          { icon: "library-outline" as const, label: "Library", value: "Sahitya Sabha" },
          { icon: "time-outline" as const, label: "Session Start", value: loginTime || "—" }
        ].map((item, index, arr) => (
          <View key={item.label}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: tintBg }]}>
                <Ionicons name={item.icon} size={16} color={theme.tint} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: theme.icon }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{item.value}</Text>
              </View>
            </View>

            {index < arr.length - 1 && (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            )}
          </View>
        ))}
      </View>

      <View style={{ marginTop: 24 }}>
        <TouchableOpacity
          onPress={() => router.push("/change-password")}
          style={{
            backgroundColor: theme.tint,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center"
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Change Password</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => router.push("/delete-account")}
        style={{
          backgroundColor: "#e53935",
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 18
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 16
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20
  },
  avatarCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    elevation: 2
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4
  },
  role: {
    fontSize: 13,
    marginBottom: 20
  },
  statsRow: {
    flexDirection: "row",
    width: "100%"
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 4
  },
  statNum: {
    fontSize: 22,
    fontWeight: "700"
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4
  },
  infoCard: {
    borderRadius: 16,
    paddingHorizontal: 8
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 3
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500"
  },
  divider: {
    height: 1,
    marginHorizontal: 6
  }
});
