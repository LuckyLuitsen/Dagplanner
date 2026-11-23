export type Exercise = { id: string; name: string; weight: string; sets: string; reps: string };
export type CheckItem = { id: string; text: string; done: boolean };

export type Activity = {
  id: string;
  title: string;
  start: number; // minutes since midnight
  end: number;
  reminder: number | null; // minutes before start, null = none
  notes: string;
  checklist: CheckItem[];
  exercises: Exercise[];
};

export type Scope = "day" | "template";

export type PlannerData = {
  days: Record<string, Activity[]>; // key YYYY-MM-DD
  template: Record<string, Activity[]>; // key "0".."6" (Monday = 0)
  wake: number;
  bed: number;
};

export type CopyMode = "replace" | "add";
