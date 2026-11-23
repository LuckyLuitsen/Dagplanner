import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";

import { Button } from "@/src/components/Button";
import { Sheet } from "@/src/components/Sheet";
import { TimeSheet } from "@/src/components/TimeSheet";
import { DAY_NAMES, fmtDuration, fmtShortDate, fmtTime, haptic, parseKey, uid, weekdayIndex } from "@/src/lib";
import { getPermState, PermState, requestPerm } from "@/src/notifications";
import { usePlanner } from "@/src/store";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { Activity, Scope } from "@/src/types";

const REMINDERS: { label: string; value: number | null }[] = [
  { label: "Geen", value: null },
  { label: "Op tijd", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 uur", value: 60 },
];

export default function ActivityScreen() {
  const { loaded } = usePlanner();
  const { colors } = useTheme();
  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: "center" }} testID="activity-loading">
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  return <ActivityEditor />;
}

function ActivityEditor() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ scope: Scope; key: string; id?: string; start?: string }>();
  const { getList, saveActivity, deleteActivity, showToast } = usePlanner();
  const scope = params.scope ?? "day";
  const key = params.key ?? "";
  const existing = params.id ? getList(scope, key).find((a) => a.id === params.id) : undefined;

  const [draft, setDraft] = useState<Activity>(() => {
    if (existing) return existing;
    const s = Math.min(Number(params.start ?? 480), 23 * 60);
    return { id: uid(), title: "", start: s, end: Math.min(s + 60, 23 * 60 + 59), reminder: null, notes: "", checklist: [], exercises: [] };
  });
  const [timeEdit, setTimeEdit] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState("");
  const [newItem, setNewItem] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [perm, setPerm] = useState<PermState>("granted");

  useEffect(() => {
    getPermState().then(setPerm);
  }, []);

  const set = (patch: Partial<Activity>) => setDraft((d) => ({ ...d, ...patch }));
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const dayLabel = scope === "day" ? `${DAY_NAMES[weekdayIndex(parseKey(key))]} ${fmtShortDate(parseKey(key))}` : `Vaste ${DAY_NAMES[Number(key)].toLowerCase()}`;

  const save = () => {
    const title = draft.title.trim();
    if (!title) return setError("Geef de activiteit een naam.");
    if (draft.end <= draft.start) return setError("De eindtijd moet na de begintijd liggen.");
    saveActivity(scope, key, {
      ...draft,
      title,
      checklist: draft.checklist.filter((c) => c.text.trim()),
      exercises: draft.exercises.filter((e) => e.name.trim() || e.weight || e.sets || e.reps),
    });
    haptic.success();
    showToast(existing ? "Activiteit bijgewerkt" : "Activiteit toegevoegd");
    close();
  };

  const addItem = () => {
    const t = newItem.trim();
    if (!t) return;
    set({ checklist: [...draft.checklist, { id: uid(), text: t, done: false }] });
    setNewItem("");
  };

  const updateExercise = (id: string, patch: Partial<Activity["exercises"][number]>) =>
    set({ exercises: draft.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const askPermission = async () => {
    if (perm === "blocked") return Linking.openSettings();
    setPerm(await requestPerm());
  };

  return (
    <View style={styles.screen} testID="activity-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="activity-close-button" onPress={close} style={styles.headerBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>{existing ? "Activiteit" : "Nieuwe activiteit"}</Text>
          <Text style={styles.headerSub}>{dayLabel}</Text>
        </View>
        <Pressable testID="activity-save-button" onPress={save} style={styles.saveBtn}>
          <Text style={styles.saveText}>Opslaan</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {error ? (
          <View style={styles.error} testID="activity-error">
            <Feather name="alert-circle" size={16} color={colors.onError} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          testID="activity-title-input"
          value={draft.title}
          onChangeText={(t) => {
            set({ title: t });
            setError("");
          }}
          placeholder="Naam, bijv. Sporten"
          placeholderTextColor={colors.muted}
          style={styles.titleInput}
          autoFocus={!existing}
        />

        <View style={styles.timeRow}>
          {(["start", "end"] as const).map((k) => (
            <Pressable key={k} testID={`activity-${k}-time-button`} onPress={() => setTimeEdit(k)} style={styles.timeBox}>
              <Text style={styles.label}>{k === "start" ? "Begin" : "Einde"}</Text>
              <Text style={styles.timeValue}>{fmtTime(draft[k])}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.duration} testID="activity-duration">
          {draft.end > draft.start ? `Duur: ${fmtDuration(draft.end - draft.start)}` : "Eindtijd ligt vóór begintijd"}
        </Text>

        <Text style={styles.section}>Herinnering</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
          {REMINDERS.map((r) => {
            const sel = draft.reminder === r.value;
            return (
              <Pressable
                key={r.label}
                testID={`reminder-chip-${r.value ?? "none"}`}
                onPress={() => {
                  haptic.select();
                  set({ reminder: r.value });
                }}
                style={[styles.chip, sel && styles.chipSel]}
                hitSlop={6}
              >
                <Text style={[styles.chipText, sel && styles.chipTextSel]}>{r.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {draft.reminder !== null && scope === "template" ? (
          <Text style={styles.hint}>Herinneringen gaan af zodra je de weekplanning op een week toepast.</Text>
        ) : null}
        {draft.reminder !== null && perm === "unsupported" ? (
          <Text style={styles.hint}>Meldingen werken in de app op je telefoon.</Text>
        ) : null}
        {draft.reminder !== null && (perm === "undetermined" || perm === "denied" || perm === "blocked") ? (
          <View style={styles.permCard} testID="notification-permission-card">
            <Feather name="bell" size={18} color={colors.onBrandTertiary} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={styles.permText}>
                {perm === "blocked"
                  ? "Meldingen staan uit. Zet ze aan in de instellingen om herinneringen te krijgen."
                  : "Sta meldingen toe, dan krijg je een seintje vóór deze activiteit."}
              </Text>
              <Button
                label={perm === "blocked" ? "Open instellingen" : "Meldingen toestaan"}
                variant="primary"
                onPress={askPermission}
                testID="notification-permission-button"
              />
            </View>
          </View>
        ) : null}

        <Text style={styles.section}>Oefeningen</Text>
        {draft.exercises.map((e, i) => (
          <View key={e.id} style={styles.exCard} testID={`exercise-${i}`}>
            <View style={styles.exTop}>
              <TextInput
                testID={`exercise-${i}-name-input`}
                value={e.name}
                onChangeText={(t) => updateExercise(e.id, { name: t })}
                placeholder="Oefening, bijv. Bankdrukken"
                placeholderTextColor={colors.muted}
                style={styles.exName}
              />
              <Pressable
                testID={`exercise-${i}-delete-button`}
                onPress={() => set({ exercises: draft.exercises.filter((x) => x.id !== e.id) })}
                style={styles.smallBtn}
              >
                <Feather name="trash-2" size={18} color={colors.error} />
              </Pressable>
            </View>
            <View style={styles.exFields}>
              {(
                [
                  ["weight", "Gewicht (kg)"],
                  ["sets", "Sets"],
                  ["reps", "Herhalingen"],
                ] as const
              ).map(([f, label]) => (
                <View key={f} style={{ flex: 1 }}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    testID={`exercise-${i}-${f}-input`}
                    value={e[f]}
                    onChangeText={(t) => updateExercise(e.id, { [f]: t.replace(f === "weight" ? /[^0-9.,]/g : /[^0-9]/g, "") })}
                    keyboardType={f === "weight" ? "decimal-pad" : "number-pad"}
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    style={styles.numInput}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
        <Button
          label="Oefening toevoegen"
          icon="plus"
          variant="secondary"
          onPress={() => set({ exercises: [...draft.exercises, { id: uid(), name: "", weight: "", sets: "", reps: "" }] })}
          testID="add-exercise-button"
        />

        <Text style={styles.section}>Checklist</Text>
        {draft.checklist.map((c, i) => (
          <View key={c.id} style={styles.checkRow} testID={`checklist-item-${i}`}>
            <Pressable
              testID={`checklist-item-${i}-toggle`}
              onPress={() => {
                haptic.light();
                set({ checklist: draft.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) });
              }}
              style={[styles.checkBox, c.done && styles.checkBoxOn]}
            >
              {c.done ? <Feather name="check" size={14} color={colors.onBrandPrimary} /> : null}
            </Pressable>
            <TextInput
              testID={`checklist-item-${i}-input`}
              value={c.text}
              onChangeText={(t) => set({ checklist: draft.checklist.map((x) => (x.id === c.id ? { ...x, text: t } : x)) })}
              style={[styles.checkInput, c.done && styles.checkDone]}
            />
            <Pressable
              testID={`checklist-item-${i}-delete`}
              onPress={() => set({ checklist: draft.checklist.filter((x) => x.id !== c.id) })}
              style={styles.smallBtn}
            >
              <Feather name="x" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            testID="checklist-new-input"
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addItem}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder="Subtaak toevoegen"
            placeholderTextColor={colors.muted}
            style={styles.addInput}
          />
          <Pressable testID="checklist-add-button" onPress={addItem} style={styles.addBtn}>
            <Feather name="plus" size={20} color={colors.onBrandPrimary} />
          </Pressable>
        </View>

        <Text style={styles.section}>Notities</Text>
        <TextInput
          testID="activity-notes-input"
          value={draft.notes}
          onChangeText={(t) => set({ notes: t })}
          placeholder="Extra details…"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.notes}
        />

        {existing ? (
          <Button
            label="Activiteit verwijderen"
            icon="trash-2"
            variant="danger"
            onPress={() => setConfirmDelete(true)}
            style={{ marginTop: spacing.xl }}
            testID="activity-delete-button"
          />
        ) : null}
      </KeyboardAwareScrollView>

      <TimeSheet
        visible={timeEdit !== null}
        title={timeEdit === "end" ? "Eindtijd" : "Begintijd"}
        value={timeEdit === "end" ? draft.end : draft.start}
        onClose={() => setTimeEdit(null)}
        onConfirm={(m) => {
          if (timeEdit === "start") {
            const len = Math.max(draft.end - draft.start, 15);
            set({ start: m, end: draft.end > m ? draft.end : Math.min(m + len, 23 * 60 + 59) });
          } else set({ end: m });
          setError("");
          setTimeEdit(null);
        }}
      />

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Activiteit verwijderen?" testID="delete-confirm-sheet">
        <Text style={styles.hint}>&quot;{draft.title || "Activiteit"}&quot; wordt definitief verwijderd.</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
          <Button label="Annuleren" variant="secondary" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} testID="delete-cancel-button" />
          <Button
            label="Verwijderen"
            variant="danger"
            onPress={() => {
              deleteActivity(scope, key, draft.id);
              setConfirmDelete(false);
              showToast("Activiteit verwijderd");
              close();
            }}
            style={{ flex: 1 }}
            testID="delete-confirm-button"
          />
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    backgroundColor: c.surface,
  },
  headerBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: c.onSurface },
  headerSub: { fontSize: 12, color: c.muted },
  saveBtn: { height: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.brandPrimary, justifyContent: "center", marginRight: spacing.xs },
  saveText: { color: c.onBrandPrimary, fontWeight: "600", fontSize: 14 },
  content: { padding: spacing.lg },
  error: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.error, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: c.onError, fontSize: 14, fontWeight: "500", flex: 1 },
  titleInput: { fontSize: 24, fontWeight: "700", color: c.onSurface, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  timeRow: { flexDirection: "row", gap: spacing.md },
  timeBox: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  label: { fontSize: 12, color: c.muted, fontWeight: "600", marginBottom: 4 },
  timeValue: { fontSize: 28, fontWeight: "700", color: c.onSurface, fontVariant: ["tabular-nums"] },
  duration: { fontSize: 14, color: c.muted, marginTop: spacing.sm },
  section: { fontSize: 12, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.6, marginTop: spacing.xl, marginBottom: spacing.sm },
  chipRow: { height: 56, flexGrow: 0, marginHorizontal: -spacing.lg },
  chipContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  chip: { flexShrink: 0, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, justifyContent: "center" },
  chipSel: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontSize: 14, color: c.onSurfaceSecondary, fontWeight: "500" },
  chipTextSel: { color: c.onBrandPrimary },
  hint: { fontSize: 14, color: c.muted, lineHeight: 20 },
  permCard: { flexDirection: "row", gap: spacing.md, backgroundColor: c.brandTertiary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  permText: { fontSize: 14, color: c.onBrandTertiary, lineHeight: 20 },
  exCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: c.border },
  exTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  exName: { flex: 1, fontSize: 16, fontWeight: "600", color: c.onSurface, minHeight: 44 },
  exFields: { flexDirection: "row", gap: spacing.sm },
  numInput: { height: 44, borderRadius: radius.sm, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.sm, fontSize: 16, color: c.onSurface, textAlign: "center" },
  smallBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center", marginLeft: spacing.xs },
  checkBoxOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  checkInput: { flex: 1, fontSize: 16, color: c.onSurface, minHeight: 44 },
  checkDone: { textDecorationLine: "line-through", color: c.muted },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  addInput: { flex: 1, height: 48, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, paddingHorizontal: spacing.md, fontSize: 16, color: c.onSurface },
  addBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  notes: { minHeight: 110, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, padding: spacing.md, fontSize: 16, color: c.onSurface, textAlignVertical: "top" },
}));
