import { Platform } from "react-native";

// Library-appropriate green palette
const tintLight = "#00796b";  // deep teal-green
const tintDark  = "#4db6ac";  // soft teal for dark mode

export const Colors = {
  light: {
    text:       "#1a1a2e",
    background: "#f7f8fc",
    card:       "#ffffff",
    input:      "#ffffff",
    border:     "#e2e5ec",
    button:     tintLight,
    buttonText: "#ffffff",
    tint:       tintLight,
    icon:       "#6b7280",
    tabIconDefault:  "#6b7280",
    tabIconSelected: tintLight,
  },
  dark: {
    text:       "#e8eaf0",
    background: "#111318",
    card:       "#1c1f26",
    input:      "#252830",
    border:     "#2e3240",
    button:     tintDark,
    buttonText: "#ffffff",
    tint:       tintDark,
    icon:       "#8b95a1",
    tabIconDefault:  "#8b95a1",
    tabIconSelected: tintDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans:    "system-ui",
    serif:   "ui-serif",
    rounded: "ui-rounded",
    mono:    "ui-monospace",
  },
  default: {
    sans:    "normal",
    serif:   "serif",
    rounded: "normal",
    mono:    "monospace",
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
