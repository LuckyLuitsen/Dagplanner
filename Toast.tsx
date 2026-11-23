import React from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";

import { usePlanner } from "@/src/store";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function Toast() {
  const { toast } = usePlanner();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 140 }]}>
      <Animated.View key={toast.id} entering={FadeInDown.duration(200)} exiting={FadeOutDown} style={styles.toast} testID="toast">
        <Feather name="check-circle" size={18} color={colors.onSurfaceInverse} />
        <Text style={styles.text}>{toast.text}</Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceInverse,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  text: { color: c.onSurfaceInverse, fontSize: 14, fontWeight: "500" },
}));
