import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { fmtTime, haptic } from "@/src/lib";
import { makeStyles, radius, spacing } from "@/src/theme";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

const ITEM = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type Props = {
  visible: boolean;
  title: string;
  value: number;
  onClose: () => void;
  onConfirm: (min: number) => void;
};

export function TimeSheet({ visible, title, value, onClose, onConfirm }: Props) {
  const styles = useStyles();
  const [h, setH] = useState(Math.floor(value / 60));
  const [m, setM] = useState(value % 60);
  const hRef = useRef<any>(null);
  const mRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setH(Math.floor(value / 60));
      setM(value % 60);
    }
  }, [visible, value]);

  const scrollToSelected = () => {
    setTimeout(() => {
      hRef.current?.scrollTo({ y: Math.max(0, (Math.floor(value / 60) - 2) * ITEM), animated: false });
      mRef.current?.scrollTo({ y: Math.max(0, ((value % 60) - 2) * ITEM), animated: false });
    }, 50);
  };

  const col = (items: number[], sel: number, onSel: (n: number) => void, ref: React.RefObject<any>, prefix: string) => (
    <ScrollView ref={ref} style={styles.col} showsVerticalScrollIndicator={false} nestedScrollEnabled>
      {items.map((n) => (
        <Pressable
          key={n}
          testID={`${prefix}-${n}`}
          onPress={() => {
            haptic.select();
            onSel(n);
          }}
          style={[styles.item, n === sel && styles.itemSel]}
        >
          <Text style={[styles.itemText, n === sel && styles.itemTextSel]}>{String(n).padStart(2, "0")}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={title} onShow={scrollToSelected} testID="time-sheet">
      <Text style={styles.preview} testID="time-sheet-preview">
        {fmtTime(h * 60 + m)}
      </Text>
      <View style={styles.cols}>
        <View style={styles.colWrap}>
          <Text style={styles.colLabel}>Uur</Text>
          {col(HOURS, h, setH, hRef, "time-hour")}
        </View>
        <View style={styles.colWrap}>
          <Text style={styles.colLabel}>Minuut</Text>
          {col(MINUTES, m, setM, mRef, "time-minute")}
        </View>
      </View>
      <Button label="Klaar" onPress={() => onConfirm(h * 60 + m)} testID="time-sheet-confirm" />
    </Sheet>
  );
}

const useStyles = makeStyles((c) => ({
  preview: { fontSize: 40, fontWeight: "700", color: c.onSurface, textAlign: "center", marginBottom: spacing.md, fontVariant: ["tabular-nums"] },
  cols: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  colWrap: { flex: 1 },
  colLabel: { fontSize: 12, color: c.muted, textAlign: "center", marginBottom: spacing.xs, fontWeight: "600", textTransform: "uppercase" },
  col: { height: ITEM * 5, backgroundColor: c.surfaceSecondary, borderRadius: radius.md },
  item: { height: ITEM, alignItems: "center", justifyContent: "center", marginHorizontal: spacing.sm, borderRadius: radius.sm },
  itemSel: { backgroundColor: c.brandPrimary },
  itemText: { fontSize: 18, color: c.onSurfaceSecondary, fontVariant: ["tabular-nums"] },
  itemTextSel: { color: c.onBrandPrimary, fontWeight: "700" },
}));
