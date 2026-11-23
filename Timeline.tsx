import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Feather from "@react-native-vector-icons/feather";

import { fmtDuration, fmtTime, nowMinutes } from "@/src/lib";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { Activity } from "@/src/types";
import { Button } from "./Button";

type Props = {
  activities: Activity[];
  wake: number;
  bed: number;
  isToday: boolean;
  onPressActivity: (a: Activity) => void;
  onAdd: () => void;
  onEditWake: () => void;
  onEditBed: () => void;
  bottomPad: number;
  emptyText: string;
};

function useNow(enabled: boolean) {
  const [now, setNow] = useState(nowMinutes());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(nowMinutes()), 30000);
    return () => clearInterval(t);
  }, [enabled]);
  return now;
}

export function Timeline({ activities, wake, bed, isToday, onPressActivity, onAdd, onEditWake, onEditBed, bottomPad, emptyText }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const now = useNow(isToday);

  const rows: React.ReactNode[] = [];
  let prevEnd = wake;
  let nowShown = !isToday;

  const marker = (key: string, icon: "sunrise" | "moon", label: string, time: number, onPress: () => void) => (
    <Pressable key={key} testID={`timeline-${key}`} onPress={onPress} style={styles.row}>
      <Text style={styles.time}>{fmtTime(time)}</Text>
      <View style={styles.track}>
        <View style={styles.markerDot}>
          <Feather name={icon} size={12} color={colors.onBrandSecondary} />
        </View>
      </View>
      <View style={styles.markerBody}>
        <Text style={styles.markerText}>{label}</Text>
        <Feather name="edit-2" size={14} color={colors.muted} />
      </View>
    </Pressable>
  );

  const nowRow = (key: string) => (
    <View key={key} style={styles.nowRow} testID="timeline-now">
      <Text style={styles.nowTime}>{fmtTime(now)}</Text>
      <View style={styles.nowDot} />
      <View style={styles.nowLine} />
    </View>
  );

  let wakeShown = false;
  let bedShown = false;
  const wakeRow = () => marker("wake", "sunrise", "Opstaan", wake, onEditWake);
  const bedRow = () => marker("bed", "moon", "Naar bed", bed, onEditBed);

  activities.forEach((a, i) => {
    if (!wakeShown && a.start >= wake) {
      rows.push(wakeRow());
      wakeShown = true;
    }
    if (!bedShown && a.start > bed) {
      if (!nowShown && now < bed) {
        rows.push(nowRow("now"));
        nowShown = true;
      }
      rows.push(bedRow());
      bedShown = true;
    }
    if (!nowShown && now < a.start) {
      rows.push(nowRow("now"));
      nowShown = true;
    }
    const gap = a.start - prevEnd;
    if (gap >= 15) {
      rows.push(
        <View key={`gap-${a.id}`} style={styles.gapRow}>
          <View style={styles.timeSpacer} />
          <View style={styles.track} />
          <Text style={styles.gapText}>Vrij · {fmtDuration(gap)}</Text>
        </View>,
      );
    }
    const current = isToday && now >= a.start && now < a.end;
    if (current) nowShown = true;
    const past = isToday && now >= a.end;
    const done = a.checklist.filter((c) => c.done).length;
    rows.push(
      <Animated.View key={a.id} entering={FadeInDown.delay(Math.min(i, 8) * 30).duration(250)}>
        <Pressable
          testID={`activity-card-${a.id}`}
          onPress={() => onPressActivity(a)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.timeCol}>
            <Text style={[styles.time, current && { color: colors.brandPrimary }]}>{fmtTime(a.start)}</Text>
            <Text style={styles.timeEnd}>{fmtTime(a.end)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.dot, current && styles.dotCurrent, past && styles.dotPast]} />
          </View>
          <View style={[styles.card, current && styles.cardCurrent, past && { opacity: 0.75 }]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {a.title}
              </Text>
              {a.reminder !== null ? <Feather name="bell" size={14} color={colors.brandPrimary} /> : null}
            </View>
            <Text style={styles.cardSub}>
              {current ? "Nu bezig · " : ""}
              {fmtDuration(a.end - a.start)}
            </Text>
            {a.notes || a.checklist.length || a.exercises.length ? (
              <View style={styles.meta}>
                {a.exercises.length ? (
                  <View style={styles.metaItem}>
                    <Feather name="activity" size={12} color={colors.onBrandTertiary} />
                    <Text style={styles.metaText}>{a.exercises.length} oefening{a.exercises.length > 1 ? "en" : ""}</Text>
                  </View>
                ) : null}
                {a.checklist.length ? (
                  <View style={styles.metaItem}>
                    <Feather name="check-square" size={12} color={colors.onBrandTertiary} />
                    <Text style={styles.metaText}>
                      {done}/{a.checklist.length}
                    </Text>
                  </View>
                ) : null}
                {a.notes ? (
                  <View style={styles.metaItem}>
                    <Feather name="file-text" size={12} color={colors.onBrandTertiary} />
                    <Text style={styles.metaText}>Notitie</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>,
    );
    prevEnd = Math.max(prevEnd, a.end);
  });

  if (!wakeShown) rows.push(wakeRow());
  if (!nowShown && now < bed && activities.length) rows.push(nowRow("now"));
  if (!bedShown) rows.push(bedRow());

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false} testID="timeline">
      {activities.length === 0 ? (
        <>
          {wakeRow()}
          <View style={styles.empty} testID="timeline-empty">
            <View style={styles.emptyIcon}>
              <Feather name="sun" size={28} color={colors.brandPrimary} />
            </View>
            <Text style={styles.emptyText}>{emptyText}</Text>
            <Button label="Toevoegen" icon="plus" onPress={onAdd} testID="timeline-empty-add-button" />
          </View>
          {bedRow()}
        </>
      ) : (
        rows
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  row: { flexDirection: "row", alignItems: "stretch", minHeight: 48, marginBottom: spacing.sm },
  timeCol: { width: 52, paddingTop: spacing.md },
  time: { width: 52, fontSize: 14, fontWeight: "600", color: c.onSurface, fontVariant: ["tabular-nums"], paddingTop: spacing.md },
  timeSpacer: { width: 52 },
  timeEnd: { fontSize: 12, color: c.muted, fontVariant: ["tabular-nums"], marginTop: 2 },
  track: { width: 28, alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.brand, marginTop: spacing.md + 3, borderWidth: 2, borderColor: c.surface },
  dotCurrent: { backgroundColor: c.brandPrimary, width: 14, height: 14, borderRadius: 7 },
  dotPast: { backgroundColor: c.borderStrong },
  markerDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.brandSecondary, alignItems: "center", justifyContent: "center", marginTop: spacing.sm + 2 },
  markerBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    minHeight: 44,
  },
  markerText: { fontSize: 14, fontWeight: "600", color: c.onSurfaceSecondary },
  card: {
    flex: 1,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardCurrent: { backgroundColor: c.brandTertiary, borderColor: c.brandPrimary },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: c.onSurface },
  cardSub: { fontSize: 12, color: c.muted, marginTop: 2 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brandTertiary, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  metaText: { fontSize: 12, color: c.onBrandTertiary, fontWeight: "500" },
  gapRow: { flexDirection: "row", alignItems: "center", height: 28, marginBottom: spacing.sm },
  gapText: { fontSize: 12, color: c.muted, fontStyle: "italic" },
  nowRow: { flexDirection: "row", alignItems: "center", height: 24, marginBottom: spacing.sm },
  nowTime: { width: 52, fontSize: 12, fontWeight: "700", color: c.brandSecondary, fontVariant: ["tabular-nums"] },
  nowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.brandSecondary, marginHorizontal: 9 },
  nowLine: { flex: 1, height: 2, backgroundColor: c.brandSecondary, borderRadius: 1 },
  empty: { alignItems: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.lg, marginBottom: spacing.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, color: c.onSurfaceSecondary, textAlign: "center", lineHeight: 22 },
}));
