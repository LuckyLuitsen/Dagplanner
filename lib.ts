import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export const DAY_NAMES = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
export const DAY_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];
export const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
export const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const pad = (n: number) => String(n).padStart(2, "0");

export const fmtTime = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} u ${m} min`;
  if (h) return `${h} uur`;
  return `${m} min`;
};

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7; // Monday = 0

export const startOfWeek = (d: Date) => addDays(d, -weekdayIndex(d));

export const isSameDay = (a: Date, b: Date) => dateKey(a) === dateKey(b);

export const nowMinutes = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

export const fmtLongDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export const fmtShortDate = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

export const haptic = {
  light: () => Platform.OS !== "web" && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Platform.OS !== "web" && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  select: () => Platform.OS !== "web" && Haptics.selectionAsync(),
  success: () => Platform.OS !== "web" && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};
