import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";

import { CopySheet } from "@/src/components/CopySheet";
import { Fab } from "@/src/components/Fab";
import { Timeline } from "@/src/components/Timeline";
import { TimeSheet } from "@/src/components/TimeSheet";
import { addDays, DAY_NAMES, DAY_SHORT, dateKey, fmtLongDate, fmtShortDate, haptic, isSameDay, startOfWeek, weekdayIndex } from "@/src/lib";
import { usesNativeTabs } from "@/src/navigation";
import { usePlanner } from "@/src/store";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function DayScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loaded, getList, copyDay, setWakeBed, showToast } = usePlanner();
  const [date, setDate] = useState(new Date());
  const [copyOpen, setCopyOpen] = useState(false);
  const [timeEdit, setTimeEdit] = useState<"wake" | "bed" | null>(null);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const key = dateKey(date);
  const today = new Date();
  const isToday = isSameDay(date, today);
  const weekStart = startOfWeek(date);
  const activities = getList("day", key);

  const targets = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => addDays(weekStart, i))
        .filter((d) => dateKey(d) !== key)
        .map((d) => ({ key: dateKey(d), label: DAY_NAMES[weekdayIndex(d)], sub: fmtShortDate(d) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const openNew = () => {
    haptic.medium();
    const last = activities[activities.length - 1];
    const start = last ? Math.min(last.end, 23 * 60) : data.wake;
    router.push({ pathname: "/activity", params: { scope: "day", key, start: String(start) } });
  };

  const title = isToday ? "Vandaag" : isSameDay(date, addDays(today, 1)) ? "Morgen" : DAY_NAMES[weekdayIndex(date)];

  return (
    <View style={styles.screen} testID="day-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} testID="day-title">
              {title}
            </Text>
            <Text style={styles.subtitle} testID="day-subtitle">
              {isToday ? `${DAY_NAMES[weekdayIndex(date)]} ` : ""}
              {fmtLongDate(date)}
            </Text>
          </View>
          {!isToday ? (
            <Pressable testID="go-today-button" onPress={() => setDate(new Date())} style={styles.pill} hitSlop={6}>
              <Text style={styles.pillText}>Vandaag</Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="copy-day-button"
            onPress={() => setCopyOpen(true)}
            disabled={activities.length === 0}
            style={[styles.iconBtn, activities.length === 0 && { opacity: 0.4 }]}
          >
            <Feather name="copy" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
        <View style={styles.strip}>
          <Pressable testID="prev-week-button" onPress={() => setDate(addDays(date, -7))} style={styles.chev} hitSlop={{ left: 8, right: 8 }}>
            <Feather name="chevron-left" size={20} color={colors.muted} />
          </Pressable>
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d, i) => {
            const sel = isSameDay(d, date);
            const t = isSameDay(d, today);
            const has = (data.days[dateKey(d)] ?? []).length > 0;
            return (
              <Pressable
                key={i}
                testID={`week-strip-day-${i}`}
                onPress={() => {
                  haptic.select();
                  setDate(d);
                }}
                style={[styles.day, sel && styles.daySel]}
              >
                <Text style={[styles.dayShort, sel && styles.daySelText, t && !sel && { color: colors.brandPrimary }]}>{DAY_SHORT[i]}</Text>
                <Text style={[styles.dayNum, sel && styles.daySelText, t && !sel && { color: colors.brandPrimary }]}>{d.getDate()}</Text>
                <View style={[styles.dayDot, has && { backgroundColor: sel ? colors.onBrandPrimary : colors.brand }]} />
              </Pressable>
            );
          })}
          <Pressable testID="next-week-button" onPress={() => setDate(addDays(date, 7))} style={styles.chev} hitSlop={{ left: 8, right: 8 }}>
            <Feather name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      {!loaded ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.brandPrimary} />
      ) : (
        <Timeline
          activities={activities}
          wake={data.wake}
          bed={data.bed}
          isToday={isToday}
          onAdd={openNew}
          onPressActivity={(a) => router.push({ pathname: "/activity", params: { scope: "day", key, id: a.id } })}
          onEditWake={() => setTimeEdit("wake")}
          onEditBed={() => setTimeEdit("bed")}
          bottomPad={bottomChrome + 96}
          emptyText="Nog geen activiteiten op deze dag. Tijd om te plannen!"
        />
      )}

      <Fab onPress={openNew} bottom={bottomChrome + spacing.lg} testID="add-activity-fab" />

      <CopySheet
        visible={copyOpen}
        onClose={() => setCopyOpen(false)}
        title={`${DAY_NAMES[weekdayIndex(date)]} kopiëren`}
        hint={`Kopieer alle ${activities.length} activiteiten van ${fmtShortDate(date)} naar:`}
        targets={targets}
        multi
        confirmLabel="Kopiëren"
        testID="copy-day-sheet"
        onConfirm={(keys, mode) => {
          copyDay("day", key, keys, mode);
          setCopyOpen(false);
          haptic.success();
          showToast(`Gekopieerd naar ${keys.length} dag${keys.length > 1 ? "en" : ""}`);
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
  header: { backgroundColor: c.surface, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "700", color: c.onSurface, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: c.muted, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  pill: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.brandTertiary, justifyContent: "center" },
  pillText: { fontSize: 14, fontWeight: "600", color: c.onBrandTertiary },
  strip: { flexDirection: "row", alignItems: "center" },
  chev: { width: 28, height: 56, alignItems: "center", justifyContent: "center" },
  day: { flex: 1, height: 64, alignItems: "center", justifyContent: "center", borderRadius: radius.md, gap: 2 },
  daySel: { backgroundColor: c.brandPrimary },
  dayShort: { fontSize: 12, color: c.muted, fontWeight: "500" },
  dayNum: { fontSize: 16, color: c.onSurface, fontWeight: "700" },
  daySelText: { color: c.onBrandPrimary },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" },
}));
