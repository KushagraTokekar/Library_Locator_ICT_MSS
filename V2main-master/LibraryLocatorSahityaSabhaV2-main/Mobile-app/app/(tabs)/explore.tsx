import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeContext } from "../../context/ThemeContext";
import { Colors } from "../../constants/theme";

const TIPS = [
  { icon: "search-outline" as const,        title: "Search by Title",   desc: "Type any part of a book title to find matches instantly." },
  { icon: "person-outline" as const,        title: "Search by Author",  desc: "You can also search using the author's name." },
  { icon: "location-outline" as const,      title: "Shelf Location",    desc: "Tap the shelf badge on the result card to copy the location." },
  { icon: "time-outline" as const,          title: "Recent Searches",   desc: "Your last 6 searches are saved for quick access on the home screen." },
  { icon: "moon-outline" as const,          title: "Dark Mode",         desc: "Toggle dark/light mode from the home screen header or Settings." },
  { icon: "log-out-outline" as const,       title: "Logout",            desc: "Go to Settings to safely log out of your session." },
];

const TECH_STACK = [
  { icon: "phone-portrait-outline" as const, label: "React Native (Expo)" },
  { icon: "server-outline" as const,         label: "Node.js + Express" },
  { icon: "grid-outline" as const,           label: "MySQL Database" },
];

export default function About() {
  const { mode } = useThemeContext();
  const theme = Colors[mode];
  const tintBg = mode === "dark" ? "rgba(77,182,172,0.12)" : "rgba(0,121,107,0.08)";

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container}>

      {/* App header */}
      <View style={[styles.appHeader, { backgroundColor: theme.card }]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.tint }]}>
          <Ionicons name="library" size={40} color="white" />
        </View>
        <Text style={[styles.appName, { color: theme.text }]}>Library Locator</Text>
        <Text style={[styles.version, { color: theme.icon }]}>Version 1.0.0</Text>
        <Text style={[styles.appDesc, { color: theme.icon }]}>
          Book search &amp; shelf locator for Sahitya Sabha library staff.
        </Text>
      </View>

      {/* Tips */}
      <Text style={[styles.sectionLabel, { color: theme.icon }]}>How to Use</Text>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        {TIPS.map((tip, index) => (
          <View key={tip.title}>
            <View style={styles.tipRow}>
              <View style={[styles.tipIcon, { backgroundColor: tintBg }]}>
                <Ionicons name={tip.icon} size={18} color={theme.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipTitle, { color: theme.text }]}>{tip.title}</Text>
                <Text style={[styles.tipDesc,  { color: theme.icon }]}>{tip.desc}</Text>
              </View>
            </View>
            {index < TIPS.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          </View>
        ))}
      </View>

      {/* Tech stack */}
      <Text style={[styles.sectionLabel, { color: theme.icon }]}>Built With</Text>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        {TECH_STACK.map((item, index) => (
          <View key={item.label}>
            <View style={styles.techRow}>
              <Ionicons name={item.icon} size={20} color={theme.tint} style={{ marginRight: 14 }} />
              <Text style={[styles.techLabel, { color: theme.text }]}>{item.label}</Text>
            </View>
            {index < TECH_STACK.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          </View>
        ))}
      </View>

      <Text style={[styles.footer, { color: theme.border }]}>Sahitya Sabha Library System · 2024</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 20, paddingTop: 16 },
  appHeader:    { borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 28, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  iconCircle:   { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  appName:      { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  version:      { fontSize: 12, marginBottom: 10 },
  appDesc:      { fontSize: 13, textAlign: "center", lineHeight: 19 },
  sectionLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginLeft: 4 },
  card:         { borderRadius: 16, paddingHorizontal: 8, marginBottom: 24, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  tipRow:       { flexDirection: "row", alignItems: "flex-start", padding: 14 },
  tipIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 14, marginTop: 2 },
  tipTitle:     { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  tipDesc:      { fontSize: 13, lineHeight: 18 },
  techRow:      { flexDirection: "row", alignItems: "center", padding: 14 },
  techLabel:    { fontSize: 15, fontWeight: "500" },
  divider:      { height: 1, marginHorizontal: 14 },
  footer:       { fontSize: 11, textAlign: "center", marginTop: 8, marginBottom: 20 },
});
