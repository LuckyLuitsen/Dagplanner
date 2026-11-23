import React from "react";
import { Pressable } from "react-native";
import Feather from "@react-native-vector-icons/feather";

import { makeStyles, spacing, useTheme } from "@/src/theme";

export function Fab({ onPress, bottom, testID }: { onPress: () => void; bottom: number; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && { transform: [{ scale: 0.94 }] }]}
    >
      <Feather name="plus" size={26} color={colors.onBrandPrimary} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: c.surfaceInverse,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
}));
