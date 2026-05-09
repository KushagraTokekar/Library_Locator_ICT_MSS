import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useThemeContext } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/theme";
import { apiFetch } from "../../services/api";

type AdminUser = {
  id: number;
  email: string;
  username?: string;
  superuser: number | string;
  email_verified?: number | string;
  status?: number | string;
  create_at?: string;
  created_at?: string;
};

type SubjectOption = {
  idsubject: number;
  subject: string;
};

export default function AdminScreen() {
  const { mode } = useThemeContext();
  const theme = Colors[mode];
  const router = useRouter();
  const { token, user, isLoading, isSuperAdmin, logout } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [bookSubjectId, setBookSubjectId] = useState("");
  const [bookName, setBookName] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookPublisher, setBookPublisher] = useState("");
  const [bookShelf, setBookShelf] = useState("");
  const [bookOldId, setBookOldId] = useState("");
  const [addingBook, setAddingBook] = useState(false);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const currentUserId = user?.id ?? null;

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!isSuperAdmin) {
      router.replace("/(tabs)/home");
      return;
    }

    void Promise.all([loadUsers(), loadSubjects()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, token, isSuperAdmin]);

  const loadUsers = async () => {
    setError("");
    try {
      const res = await apiFetch("/admin/users");

      if (!res.ok) {
        setUsers([]);
        setError(res.data?.message || "Unable to load users.");
        return;
      }

      const payload = res.data;
      const list = Array.isArray(payload?.users) ? payload.users : [];
      setUsers(list);
    } catch (err: any) {
      if (err?.message === "SESSION_EXPIRED" || err?.message === "UNAUTHORIZED") {
        await logout();
        router.replace("/login");
        return;
      }

      setError("Unable to load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await apiFetch("/admin/subjects");
      if (!res.ok) return;
      const payload = res.data;
      setSubjects(Array.isArray(payload?.subjects) ? payload.subjects : []);
    } catch {
      // non-blocking for admin users page
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
  };

  const confirmPromote = (user: AdminUser) => {
    Alert.alert(
      "Promote User",
      `Make ${user.email} a super admin?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Promote",
          onPress: () => promoteUser(user.id),
        },
      ]
    );
  };

  const confirmDelete = (user: AdminUser) => {
    if (currentUserId === user.id) {
      Alert.alert("Not allowed", "You cannot delete your own admin account here.");
      return;
    }

    Alert.alert(
      "Delete User",
      `Delete ${user.email}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteUser(user.id),
        },
      ]
    );
  };

  const promoteUser = async (userId: number) => {
    setActionId(userId);
    setError("");

    try {
      const res = await apiFetch("/admin/promote-user", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        setError(res.data?.message || "Promotion failed.");
        return;
      }

      await loadUsers();
    } catch (err: any) {
      if (err?.message === "SESSION_EXPIRED" || err?.message === "UNAUTHORIZED") {
        await logout();
        router.replace("/login");
        return;
      }

      setError("Promotion failed.");
    } finally {
      setActionId(null);
    }
  };

  const deleteUser = async (userId: number) => {
    setActionId(userId);
    setError("");

    try {
      const res = await apiFetch("/admin/delete-user", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        setError(res.data?.message || "Delete failed.");
        return;
      }

      await loadUsers();
    } catch (err: any) {
      if (err?.message === "SESSION_EXPIRED" || err?.message === "UNAUTHORIZED") {
        await logout();
        router.replace("/login");
        return;
      }

      setError("Delete failed.");
    } finally {
      setActionId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      return (
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        String(u.id).includes(q)
      );
    });
  }, [users, search]);

  const handleAddBook = async () => {
    const idsubject = Number(bookSubjectId.trim());
    if (!idsubject || !bookName.trim() || !bookAuthor.trim() || !bookPublisher.trim() || !bookShelf.trim()) {
      setError("Please fill all required book fields (Subject ID, Name, Author, Publisher, Shelf).");
      return;
    }

    setAddingBook(true);
    setError("");
    try {
      const res = await apiFetch("/admin/add-book", {
        method: "POST",
        body: JSON.stringify({
          idsubject,
          bookname: bookName.trim(),
          bookauthor: bookAuthor.trim(),
          bookpublisher: bookPublisher.trim(),
          bookshelf: bookShelf.trim(),
          oldbookid: bookOldId.trim() || null,
        }),
      });

      if (!res.ok) {
        setError(res.data?.message || "Failed to add book.");
        return;
      }

      Alert.alert("Success", "Book added successfully.");
      setBookSubjectId("");
      setBookName("");
      setBookAuthor("");
      setBookPublisher("");
      setBookShelf("");
      setBookOldId("");
    } catch (err: any) {
      if (err?.message === "SESSION_EXPIRED" || err?.message === "UNAUTHORIZED") {
        await logout();
        router.replace("/login");
        return;
      }
      setError("Failed to add book.");
    } finally {
      setAddingBook(false);
    }
  };

  if (isLoading || loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (!token || !isSuperAdmin) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Access denied.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Super Admin Panel</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Manage users and privileges
          </Text>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.refreshBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Ionicons name="refresh" size={18} color={theme.tint} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.icon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search users by email or ID"
          placeholderTextColor={theme.icon}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={theme.icon} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#e53935" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.tint }]}>{users.length}</Text>
          <Text style={[styles.statLabel, { color: theme.icon }]}>Total Users</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.tint }]}>
            {users.filter((u) => Number(u.superuser) === 1).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.icon }]}>Super Admins</Text>
        </View>
      </View>

      <View style={[styles.addBookCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.addBookTitle, { color: theme.text }]}>Add Book Entry</Text>
        <TextInput
          value={bookSubjectId}
          onChangeText={setBookSubjectId}
          placeholder="Subject ID *"
          placeholderTextColor={theme.icon}
          keyboardType="number-pad"
          style={[styles.addBookInput, { color: theme.text, borderColor: theme.border }]}
        />
        {subjects.length > 0 ? (
          <View style={styles.subjectChips}>
            {subjects.slice(0, 20).map((item) => (
              <TouchableOpacity
                key={item.idsubject}
                style={[
                  styles.subjectChip,
                  {
                    borderColor: theme.border,
                    backgroundColor:
                      String(item.idsubject) === bookSubjectId.trim() ? "rgba(77,182,172,0.2)" : "transparent",
                  },
                ]}
                onPress={() => setBookSubjectId(String(item.idsubject))}
              >
                <Text style={{ color: theme.text, fontSize: 12 }}>
                  {item.idsubject} - {item.subject}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <TextInput
          value={bookName}
          onChangeText={setBookName}
          placeholder="Book Name *"
          placeholderTextColor={theme.icon}
          style={[styles.addBookInput, { color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          value={bookAuthor}
          onChangeText={setBookAuthor}
          placeholder="Author *"
          placeholderTextColor={theme.icon}
          style={[styles.addBookInput, { color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          value={bookPublisher}
          onChangeText={setBookPublisher}
          placeholder="Publisher *"
          placeholderTextColor={theme.icon}
          style={[styles.addBookInput, { color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          value={bookShelf}
          onChangeText={setBookShelf}
          placeholder="Shelf Location *"
          placeholderTextColor={theme.icon}
          style={[styles.addBookInput, { color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          value={bookOldId}
          onChangeText={setBookOldId}
          placeholder="Old Book ID (optional)"
          placeholderTextColor={theme.icon}
          style={[styles.addBookInput, { color: theme.text, borderColor: theme.border }]}
        />
        <TouchableOpacity
          style={[styles.addBookBtn, { backgroundColor: theme.tint }]}
          onPress={handleAddBook}
          disabled={addingBook}
        >
          {addingBook ? <ActivityIndicator color="white" /> : <Text style={styles.actionText}>Add Book</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={42} color={theme.tint} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {search ? "No users match your search." : "No users found."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSuper = Number(item.superuser) === 1;
          const verified = Number(item.email_verified) === 1;
          const active = Number(item.status ?? 1) === 1;

          return (
            <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.userTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userEmail, { color: theme.text }]} numberOfLines={1}>
                    {item.email}
                  </Text>
                  <Text style={[styles.userMeta, { color: theme.icon }]}>
                    ID: {item.id}
                    {item.username ? ` • ${item.username}` : ""}
                    {item.create_at || item.created_at ? ` • ${item.create_at || item.created_at}` : ""}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isSuper ? "rgba(255,193,7,0.16)" : "rgba(77,182,172,0.14)" },
                  ]}
                >
                  <Text style={{ color: isSuper ? "#f9a825" : theme.tint, fontSize: 11, fontWeight: "700" }}>
                    {isSuper ? "SUPER ADMIN" : "USER"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoText, { color: theme.icon }]}>
                  Verified: {verified ? "Yes" : "No"}
                </Text>
                <Text style={[styles.infoText, { color: theme.icon }]}>
                  Status: {active ? "Active" : "Disabled"}
                </Text>
              </View>

              <View style={styles.actionRow}>
                {!isSuper ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.tint }]}
                    onPress={() => confirmPromote(item)}
                    disabled={actionId === item.id}
                  >
                    {actionId === item.id ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.actionText}>Make Super Admin</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.actionBtn, styles.disabledBtn]}>
                    <Text style={styles.actionText}>Protected</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => confirmDelete(item)}
                  disabled={actionId === item.id}
                >
                  {actionId === item.id ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.actionText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    paddingVertical: 0,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(229,57,53,0.08)",
  },
  errorText: {
    marginLeft: 8,
    color: "#e53935",
    fontSize: 13,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  addBookCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  addBookTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  addBookInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  subjectChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  subjectChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addBookBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  userTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "700",
  },
  userMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  deleteBtn: {
    backgroundColor: "#e53935",
  },
  disabledBtn: {
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  actionText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
