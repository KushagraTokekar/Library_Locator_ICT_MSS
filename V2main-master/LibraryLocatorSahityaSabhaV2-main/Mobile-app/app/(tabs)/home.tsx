import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useThemeContext } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/theme";
import { apiFetch } from "../../services/api";

const MAX_RECENT = 6;

const getRecentSearchesKey = (userId?: number | string | null) =>
  userId === null || userId === undefined
    ? "recent_searches_guest"
    : `recent_searches_${userId}`;

type Book = {
  oldbookid?: string;
  bookname: string;
  bookauthor: string;
  bookpublisher: string;
  bookshelf: string;
  subject: string;
};

export default function Home() {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [result, setResult] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const { mode, toggleTheme } = useThemeContext();
  const theme = Colors[mode];
  const { logout, user } = useAuth();
  const router = useRouter();
  const recentSearchKey = getRecentSearchesKey(user?.id);

  useEffect(() => {
    let mounted = true;
    setRecentSearches([]);

    AsyncStorage.getItem(recentSearchKey)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setRecentSearches(parsed);
        } catch {
          // ignore malformed cache
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [recentSearchKey]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSuggestions([]);
      setError("");
      setHasSearched(false);
      return;
    }

    const timeout = setTimeout(() => fetchSuggestions(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const saveRecent = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const updated = [trimmed, ...recentSearches.filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    await AsyncStorage.setItem(recentSearchKey, JSON.stringify(updated)).catch(() => {});
  };

  const clearRecent = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(recentSearchKey).catch(() => {});
  };

  const fetchSuggestions = async (query: string) => {
    const trimmedQuery = query.trim();
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      console.log("[HOME_SEARCH] Request", { query: trimmedQuery });
      const res = await apiFetch(`/search?book=${encodeURIComponent(trimmedQuery)}`);

      if (!res.ok) {
        setSuggestions([]);
        setError(res.data?.message || "Search failed. Please try again.");
        console.log("[HOME_SEARCH] Non-OK response", { status: res.status, message: res.data?.message });
        return;
      }

      const data = res.data;

      if (data.success && Array.isArray(data.data)) {
        setSuggestions(data.data.slice(0, 10));
        if (data.data.length === 0) {
          setError(`No books found for "${trimmedQuery}".`);
        }
        console.log("[HOME_SEARCH] Success", { query: trimmedQuery, count: data.data.length });
      } else {
        setSuggestions([]);
        setError(data.message || "Invalid search payload received.");
        console.log("[HOME_SEARCH] Invalid payload", { payload: data });
      }
    } catch (err: any) {
      if (err?.message === "SESSION_EXPIRED" || err?.message === "UNAUTHORIZED") {
        await logout();
        router.replace("/login");
        return;
      }
      setSuggestions([]);
      setError("Cannot connect to server. Please check your internet or backend service.");
      console.log("[HOME_SEARCH] Error", err);
    } finally {
      setLoading(false);
    }
  };

  const selectBook = (book: Book) => {
    setResult(book);
    setSuggestions([]);
    setSearch(book.bookname);
    setError("");
    saveRecent(book.bookname);
    setCopied(false);

    fadeAnim.setValue(0);
    slideAnim.setValue(24);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const clearSearch = () => {
    setSearch("");
    setSuggestions([]);
    setResult(null);
    setError("");
    setHasSearched(false);
    setCopied(false);
  };

  const copyShelf = async () => {
    if (!result?.bookshelf) {
      setError("Shelf location is not available for this book.");
      return;
    }
    await Clipboard.setStringAsync(result.bookshelf);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tintBg = mode === "dark" ? "rgba(77,182,172,0.12)" : "rgba(0,121,107,0.08)";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Library Locator</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>Sahitya Sabha</Text>
          </View>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.iconBtn, { backgroundColor: theme.card }]}
          >
            <Ionicons
              name={mode === "dark" ? "sunny" : "moon"}
              size={20}
              color={theme.tint}
            />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.icon}
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder="Search by title or author..."
            placeholderTextColor={theme.icon}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (search.trim().length >= 2) {
                fetchSuggestions(search);
              }
            }}
            autoCorrect={false}
          />
          {loading && (
            <ActivityIndicator size="small" color={theme.tint} style={{ marginLeft: 8 }} />
          )}
          {search.length > 0 && !loading && (
            <TouchableOpacity onPress={clearSearch} style={{ marginLeft: 6 }}>
              <Ionicons name="close-circle" size={18} color={theme.icon} />
            </TouchableOpacity>
          )}
        </View>

        {search.trim().length === 1 && (
          <Text style={[styles.hint, { color: theme.icon }]}>Type at least 2 characters…</Text>
        )}

        {error ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: "rgba(229,57,53,0.08)", borderColor: "rgba(229,57,53,0.2)" },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={15}
              color="#e53935"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {suggestions.length > 0 && (
          <View style={[styles.suggestionBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.suggestionHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.suggestionHeaderText, { color: theme.icon }]}> 
                {suggestions.length} result{suggestions.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item.bookname}-${index}`}
                style={[
                  styles.suggestionItem,
                  index < suggestions.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => selectBook(item)}
              >
                <View style={[styles.suggestionIcon, { backgroundColor: tintBg }]}>
                  <Ionicons name="book-outline" size={14} color={theme.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>
                    {item.bookname}
                  </Text>
                  <Text style={{ color: theme.icon, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {item.bookauthor} · {item.subject}
                    {item.oldbookid ? ` · Old ID: ${item.oldbookid}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.border} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {result && (
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.subjectBadge, { backgroundColor: tintBg }]}>
                <Text style={[styles.subjectText, { color: theme.tint }]}>{result.subject}</Text>
              </View>
            </View>

            <Text style={[styles.bookTitle, { color: theme.text }]}>{result.bookname}</Text>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.background }]}>
                <Ionicons name="person-outline" size={15} color={theme.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: theme.icon }]}>Author</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{result.bookauthor}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.background }]}>
                <Ionicons name="business-outline" size={15} color={theme.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: theme.icon }]}>Publisher</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{result.bookpublisher}</Text>
              </View>
            </View>

            {result.oldbookid ? (
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: theme.background }]}>
                  <Ionicons name="pricetag-outline" size={15} color={theme.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: theme.icon }]}>Old Book ID</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{result.oldbookid}</Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.shelfContainer, { backgroundColor: theme.tint }]}
              onPress={copyShelf}
              activeOpacity={0.8}
            >
              <Ionicons name="location" size={22} color="white" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.shelfLabel}>Shelf Location</Text>
                <Text style={styles.shelfValue}>{result.bookshelf}</Text>
              </View>
              <View style={styles.copyBadge}>
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={14} color="white" />
                <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {!hasSearched && !result && recentSearches.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <View style={styles.recentHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Searches</Text>
              <TouchableOpacity onPress={clearRecent}>
                <Text style={[styles.clearText, { color: theme.tint }]}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.recentBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {recentSearches.map((item, index) => (
                <TouchableOpacity
                  key={`${item}-${index}`}
                  style={[
                    styles.recentItem,
                    index < recentSearches.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    },
                  ]}
                  onPress={() => setSearch(item)}
                >
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={theme.icon}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={{ color: theme.text, flex: 1, fontSize: 14 }} numberOfLines={1}>
                    {item}
                  </Text>
                  <Ionicons name="arrow-up-outline" size={14} color={theme.border} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!hasSearched && !result && recentSearches.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: tintBg }]}>
              <Ionicons name="search" size={40} color={theme.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Find a Book</Text>
            <Text style={[styles.emptyHint, { color: theme.icon }]}>Search by title or author name to find a book and its exact shelf location.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 16, minHeight: "100%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchContainer: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  hint: { fontSize: 12, marginTop: 6, marginLeft: 4 },
  errorBox: { flexDirection: "row", alignItems: "center", marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  errorText: { color: "#e53935", fontSize: 13, flex: 1 },
  suggestionBox: { borderRadius: 14, marginTop: 10, borderWidth: 1, overflow: "hidden" },
  suggestionHeader: { borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  suggestionHeaderText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 },
  suggestionItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  suggestionIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 12 },
  card: { marginTop: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10 },
  cardHeader: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  subjectBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  subjectText: { fontSize: 12, fontWeight: "600" },
  bookTitle: { fontSize: 20, fontWeight: "700", paddingHorizontal: 18, paddingBottom: 16, lineHeight: 26 },
  divider: { height: 1, marginHorizontal: 18, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, marginBottom: 14 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  infoLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "500" },
  shelfContainer: { flexDirection: "row", alignItems: "center", margin: 16, marginTop: 4, padding: 16, borderRadius: 12 },
  shelfLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  shelfValue: { color: "white", fontSize: 18, fontWeight: "700", marginTop: 2 },
  copyBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  copyText: { color: "white", fontSize: 11, fontWeight: "600", marginLeft: 4 },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  clearText: { fontSize: 13, fontWeight: "500" },
  recentBox: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  recentItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  emptyState: { marginTop: 60, alignItems: "center", paddingHorizontal: 30 },
  emptyIconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  emptyHint: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
