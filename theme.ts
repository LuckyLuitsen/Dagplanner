// Design tokens for this app. Light theme only (user chose "Licht en rustig").
// Keys match the "color" block of /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FDFCFB",
  onSurface: "#1F2321",
  surfaceSecondary: "#F4F2F0",
  onSurfaceSecondary: "#3D4340",
  surfaceTertiary: "#EBE8E4",
  onSurfaceTertiary: "#4F5552",
  surfaceInverse: "#2B302D",
  onSurfaceInverse: "#FDFCFB",
  muted: "#767D79",

  brand: "#8FA396",
  onBrand: "#FFFFFF",
  brandPrimary: "#758C7C",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#C9A89A",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E1E6E2",
  onBrandTertiary: "#4A5C51",

  success: "#6F8C74",
  onSuccess: "#FFFFFF",
  warning: "#C7A675",
  onWarning: "#FFFFFF",
  error: "#B37B75",
  onError: "#FFFFFF",
  info: "#758C7C",
  onInfo: "#FFFFFF",

  border: "#E3E0DC",
  borderStrong: "#D1CDC7",
  divider: "#E8E5E1",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = (system === "light" || system === "dark") && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export const colors = light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
