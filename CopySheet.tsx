import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Feather from "@react-native-vector-icons/feather";

import { haptic } from "@/src/lib";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { CopyMode } from "@/src/types";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

export type Target = { key: string; label: string; sub?: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  hint: string;
  targets: Target[];
  multi: boolean;
  confirmLabel: string;
  onConfirm: (keys: string[], mode: CopyMode) => void;
  testID: string;
};

export function ModeSwitch({ mode, setMode, testID }: { mode: CopyMode; setMode: (m: CopyMode) => void; testID: string }) {
  const styles = useStyles();
  return (
    <View style={styles.seg}>
      {(["replace", "add"] as CopyMode[]).map((m) => (
        <Pressable key={m} testID={`${testID}-mode-${m}`} onPress={() => setMode(m)} style={[styles.segItem, mode === m && styles.segItemSel]}>
          <Text style={[styles.segText, mode === m && styles.segTextSel]}>{m === "replace" ? "Vervangen" : "Toevoegen"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CopySheet({ visible, onClose, title, hint, targets, multi, confirmLabel, onConfirm, testID }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [sel, setSel] = useState<string[]>([]);
  const [mode, setMode] = useState<CopyMode>("replace");

  useEffect(() => {
    if (visible) {
      setSel([]);
      setMode("replace");
    }
  }, [visible]);

  const toggle = (k: string) => {
    haptic.select();
    setSel((s) => (multi ? (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]) : [k]));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title} testID={testID}>
      <Text style={styles.hint}>{hint}</Text>
      <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
        {targets.map((t) => {
          const on = sel.includes(t.key);
          return (
            <Pressable key={t.key} testID={`${testID}-target-${t.key}`} onPress={() => toggle(t.key)} style={[styles.row, on && styles.rowOn]}>
              <View style={[styles.check, on && styles.checkOn, !multi && { borderRadius: 12 }]}>
                {on ? <Feather name="check" size={14} color={colors.onBrandPrimary} /> : null}
              </View>
              <Text style={styles.rowLabel}>{t.label}</Text>
              {t.sub ? <Text style={styles.rowSub}>{t.sub}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.modeLabel}>Bestaande activiteiten op de doeldag</Text>
      <ModeSwitch mode={mode} setMode={setMode} testID={testID} />
      <Button
        label={confirmLabel}
        icon="copy"
        disabled={sel.length === 0}
        onPress={() => onConfirm(sel, mode)}
        testID={`${testID}-confirm`}
        style={{ marginTop: spacing.lg }}
      />
    </Sheet>
  );
}

const useStyles = makeStyles((c) => ({
  hint: { fontSize: 14, color: c.muted, marginTop: -spacing.sm, marginBottom: spacing.md },
  list: { maxHeight: 340 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.surfaceSecondary,
  },
  rowOn: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  rowLabel: { flex: 1, fontSize: 16, color: c.onSurface, fontWeight: "500" },
  rowSub: { fontSize: 14, color: c.muted },
  modeLabel: { fontSize: 12, color: c.muted, fontWeight: "600", textTransform: "uppercase", marginTop: spacing.lg, marginBottom: spacing.sm },
  seg: { flexDirection: "row", backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.sm + 2 },
  segItemSel: { backgroundColor: c.surface },
  segText: { fontSize: 14, color: c.onSurfaceTertiary, fontWeight: "500" },
  segTextSel: { color: c.onSurface, fontWeight: "600" },
}));
