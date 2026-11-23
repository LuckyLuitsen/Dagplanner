import React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import Feather, { FeatherIconName } from "@react-native-vector-icons/feather";

import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: FeatherIconName;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export function Button({ label, onPress, variant = "primary", icon, disabled, style, testID }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const fg =
    variant === "primary" ? colors.onBrandPrimary : variant === "danger" ? colors.error : variant === "ghost" ? colors.brandPrimary : colors.onBrandTertiary;
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primary: { backgroundColor: c.brandPrimary },
  secondary: { backgroundColor: c.brandTertiary },
  danger: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  label: { fontSize: 16, fontWeight: "600" },
}));
