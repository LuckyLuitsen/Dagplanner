import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { storage } from "@/src/utils/storage";
import { addDays, dateKey, uid } from "./lib";
import { rescheduleReminders, setupNotifications } from "./notifications";
import type { Activity, CopyMode, PlannerData, Scope } from "./types";

const KEY = "planner_data_v1";
const EMPTY: PlannerData = { days: {}, template: {}, wake: 7 * 60, bed: 23 * 60 };

type Ctx = {
  data: PlannerData;
  loaded: boolean;
  getList: (scope: Scope, key: string) => Activity[];
  saveActivity: (scope: Scope, key: string, a: Activity) => void;
  deleteActivity: (scope: Scope, key: string, id: string) => void;
  copyDay: (scope: Scope, from: string, to: string[], mode: CopyMode) => void;
  applyTemplate: (weekStart: Date, mode: CopyMode) => void;
  toggleCheck: (scope: Scope, key: string, actId: string, itemId: string) => void;
  setWakeBed: (wake: number, bed: number) => void;
  toast: { id: number; text: string } | null;
  showToast: (text: string) => void;
};

const PlannerContext = createContext<Ctx | null>(null);

const sortList = (l: Activity[]) => [...l].sort((a, b) => a.start - b.start || a.end - b.end);

const cloneActs = (l: Activity[]) =>
  l.map((a) => ({
    ...a,
    id: uid(),
    checklist: a.checklist.map((c) => ({ ...c, id: uid(), done: false })),
    exercises: a.exercises.map((e) => ({ ...e, id: uid() })),
  }));

const bucket = (d: PlannerData, s: Scope) => (s === "day" ? d.days : d.template);
const withBucket = (d: PlannerData, s: Scope, b: Record<string, Activity[]>): PlannerData =>
  s === "day" ? { ...d, days: b } : { ...d, template: b };

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PlannerData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<Ctx["toast"]>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem(KEY, "");
      if (typeof raw === "string" && raw) {
        try {
          setData({ ...EMPTY, ...JSON.parse(raw) });
        } catch {}
      }
      setLoaded(true);
      setupNotifications();
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    storage.setItem(KEY, JSON.stringify(data));
    const t = setTimeout(() => rescheduleReminders(data), 600);
    return () => clearTimeout(t);
  }, [data, loaded]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && loaded) rescheduleReminders(dataRef.current);
    });
    return () => sub.remove();
  }, [loaded]);

  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo<Ctx>(
    () => ({
      data,
      loaded,
      toast,
      showToast,
      getList: (scope, key) => bucket(data, scope)[key] ?? [],
      saveActivity: (scope, key, a) =>
        setData((d) => {
          const b = bucket(d, scope);
          const list = b[key] ?? [];
          const next = list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a];
          return withBucket(d, scope, { ...b, [key]: sortList(next) });
        }),
      deleteActivity: (scope, key, id) =>
        setData((d) => {
          const b = bucket(d, scope);
          return withBucket(d, scope, { ...b, [key]: (b[key] ?? []).filter((x) => x.id !== id) });
        }),
      copyDay: (scope, from, to, mode) =>
        setData((d) => {
          const b = { ...bucket(d, scope) };
          const src = b[from] ?? [];
          to.forEach((k) => {
            const copied = cloneActs(src);
            b[k] = sortList(mode === "replace" ? copied : [...(b[k] ?? []), ...copied]);
          });
          return withBucket(d, scope, b);
        }),
      applyTemplate: (weekStart, mode) =>
        setData((d) => {
          const days = { ...d.days };
          for (let i = 0; i < 7; i++) {
            const k = dateKey(addDays(weekStart, i));
            const src = d.template[String(i)] ?? [];
            if (!src.length) continue; // empty template days leave the agenda untouched
            const copied = cloneActs(src);
            days[k] = sortList(mode === "replace" ? copied : [...(days[k] ?? []), ...copied]);
          }
          return { ...d, days };
        }),
      toggleCheck: (scope, key, actId, itemId) =>
        setData((d) => {
          const b = bucket(d, scope);
          const list = (b[key] ?? []).map((a) =>
            a.id !== actId ? a : { ...a, checklist: a.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) },
          );
          return withBucket(d, scope, { ...b, [key]: list });
        }),
      setWakeBed: (wake, bed) => setData((d) => ({ ...d, wake, bed })),
    }),
    [data, loaded, toast, showToast],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const c = useContext(PlannerContext);
  if (!c) throw new Error("usePlanner outside provider");
  return c;
}
