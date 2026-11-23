import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { addDays, dateKey, fmtTime } from "./lib";
import type { PlannerData } from "./types";

const CHANNEL = "herinneringen";
const DAYS_AHEAD = 14;

export const notificationsSupported = Platform.OS !== "web";

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupNotifications() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Herinneringen",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {}
}

export type PermState = "granted" | "undetermined" | "denied" | "blocked" | "unsupported";

export async function getPermState(): Promise<PermState> {
  if (!notificationsSupported) return "unsupported";
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return "granted";
  if (p.status === "undetermined") return "undetermined";
  return p.canAskAgain ? "denied" : "blocked";
}

export async function requestPerm(): Promise<PermState> {
  if (!notificationsSupported) return "unsupported";
  await Notifications.requestPermissionsAsync();
  return getPermState();
}

let chain: Promise<void> = Promise.resolve();

export function rescheduleReminders(data: PlannerData) {
  if (!notificationsSupported) return chain;
  chain = chain.then(() => doReschedule(data));
  return chain;
}

async function doReschedule(data: PlannerData) {
  {
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      const now = Date.now();
      const today = new Date();
      for (let i = 0; i < DAYS_AHEAD; i++) {
        const day = addDays(today, i);
        const list = data.days[dateKey(day)] ?? [];
        for (const a of list) {
          if (a.reminder === null || a.reminder === undefined) continue;
          const fire = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, a.start - a.reminder);
          if (fire.getTime() <= now) continue;
          const when = a.reminder === 0 ? "Nu" : `Over ${a.reminder} min`;
          await Notifications.scheduleNotificationAsync({
            content: {
              title: a.title,
              body: `${when} · ${fmtTime(a.start)} – ${fmtTime(a.end)}`,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: fire,
              channelId: CHANNEL,
            },
          });
        }
      }
    } catch (e) {
      console.warn("reschedule failed", e);
    }
  }
}
