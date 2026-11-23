import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";

import { Button } from "@/src/components/Button";
import { CopySheet } from "@/src/components/CopySheet";
import { Fab } from "@/src/components/Fab";
import { Timeline } from "@/src/components/Timeline";
import { TimeSheet } from "@/src/components/TimeSheet";
import { addDays, DAY_NAMES, DAY_SHORT, dateKey, fmtShortDate, haptic, parseKey, startOfWeek, weekdayIndex } from "@/src/lib";
import { usesNativeTabs } from "@/src/navigation";
import { usePlanner } from "@/src/store";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function WeekScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loaded, getList, copyDay, applyTemplate, setWakeBed, showToast } = usePlanner();
  const [day, setDay] = useState(weekdayIndex(new Date()));
  const [copyOpen, setCopyOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [timeEdit, setTimeEdit] = useState<"wake" | "bed" | null>(null);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const key = String(day);
  const activities = getList("template", key);
  const total = Object.values(data.template).reduce((n, l) => n + l.length, 0);

  const copyTargets = DAY_NAMES.map((n, i) => ({ key: String(i), label: n })).filter((t) => t.key !== key);
  const weekTargets = useMemo(() => {
    const ws = startOfWeek(new Date());
    const labels = ["Deze week", "Volgende week", "Over 2 weken", "Over 3 weken"];
    return labels.map((label, i) => {
      const s = addDays(ws, i * 7);
      return { key: dateKey(s), label, sub: `${fmtShortDate(s)} – ${fmtShortDate(addDays(s, 6))}` };
    });
  }, []);

  const openNew = () => {
    haptic.medium();
    const last = activities[activities.length - 1];
    const start = last ? Math.min(last.end, 23 * 60) : data.wake;
    router.push({ pathname: "/activity", params: { scope: "template", key, start: String(start) } });
  };

  return (
    <View style={styles.screen} testID="week-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Weekplanning</Text>
        <Text style={styles.subtitle}>Je vaste basisweek · {total} activiteiten</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
          {DAY_SHORT.map((s, i) => {
            const sel = i === day;
            const has = (data.template[String(i)] ?? []).length > 0;
            return (
              <Pressable
                key={s}
                testID={`template-day-chip-${i}`}
                onPress={() => {
                  haptic.select();
                  setDay(i);
                }}
                style={[styles.chip, sel && styles.chipSel]}
                hitSlop={6}
              >
                <Text style={[styles.chipText, sel && styles.chipTextSel]}>{s}</Text>
                {has ? <View style={[styles.chipDot, sel && { backgroundColor: colors.onBrandPrimary }]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.actions}>
          <Button
            label="Kopieer dag"
            icon="copy"
            variant="secondary"
            disabled={activities.length === 0}
            onPress={() => setCopyOpen(true)}
            style={{ flex: 1 }}
            testID="template-copy-day-button"
          />
          <Button
            label="Toepassen"
            icon="check-circle"
            disabled={total === 0}
            onPress={() => setApplyOpen(true)}
            style={{ flex: 1 }}
            testID="apply-template-button"
          />
        </View>
      </View>

      {!loaded ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.brandPrimary} />
      ) : (
        <Timeline
          activities={activities}
          wake={data.wake}
          bed={data.bed}
          isToday={false}
          onAdd={openNew}
          onPressActivity={(a) => router.push({ pathname: "/activity", params: { scope: "template", key, id: a.id } })}
          onEditWake={() => setTimeEdit("wake")}
          onEditBed={() => setTimeEdit("bed")}
          bottomPad={bottomChrome + 96}
          emptyText={`Je vaste ${DAY_NAMES[day].toLowerCase()} is nog leeg. Maak een vaste planning.`}
        />
      )}

      <Fab onPress={openNew} bottom={bottomChrome + spacing.lg} testID="add-template-activity-fab" />

      <CopySheet
        visible={copyOpen}
        onClose={() => setCopyOpen(false)}
        title={`Vaste ${DAY_NAMES[day].toLowerCase()} kopiëren`}
        hint="Kopieer deze dag in je basisweek naar:"
        targets={copyTargets}
        multi
        confirmLabel="Kopiëren"
        testID="template-copy-sheet"
        onConfirm={(keys, mode) => {
          copyDay("template", key, keys, mode);
          setCopyOpen(false);
          haptic.success();
          showToast(`Gekopieerd naar ${keys.length} dag${keys.length > 1 ? "en" : ""}`);
        }}
      />

      <CopySheet
        visible={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Weekplanning toepassen"
        hint="Zet je vaste week in je agenda. Lege dagen in je basisweek blijven ongewijzigd. Daarna kun je elke dag nog los aanpassen."
        targets={weekTargets}
        multi={false}
        confirmLabel="Toepassen op week"
        testID="apply-template-sheet"
        onConfirm={(keys, mode) => {
          applyTemplate(parseKey(keys[0]), mode);
          setApplyOpen(false);
          haptic.success();
          showToast("Weekplanning toegepast");
        }}
      />

      <TimeSheet
        visible={timeEdit !== null}
        title={timeEdit === "wake" ? "Opstaan" : "Naar bed"}
        value={timeEdit === "bed" ? data.bed : data.wake}
        onClose={() => setTimeEdit(null)}
        onConfirm={(m) => {
          if (timeEdit === "wake") setWakeBed(m, data.bed);
          else setWakeBed(data.wake, m);
          setTimeEdit(null);
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { backgroundColor: c.surface, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  title: { fontSize: 28, fontWeight: "700", color: c.onSurface, letterSpacing: -0.5, paddingHorizontal: spacing.lg },
  subtitle: { fontSize: 14, color: c.muted, marginTop: 2, paddingHorizontal: spacing.lg },
  chipRow: { height: 56, flexGrow: 0, marginTop: spacing.sm },
  chipContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  chip: {
    flexShrink: 0,
    height: 36,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  chipSel: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontSize: 14, fontWeight: "600", color: c.onSurfaceSecondary },
  chipTextSel: { color: c.onBrandPrimary },
  chipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.brand },
  actions: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
}));
