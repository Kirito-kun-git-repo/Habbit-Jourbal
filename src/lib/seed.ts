/**
 * Development-only demo data, so the grid, journal, weekly, and consistency
 * views can be looked at with realistic content. Never exposed in production
 * builds — the entry point is guarded by NODE_ENV in the UI.
 */
import { store } from "@/lib/data";
import { COLOR_PRESETS } from "@/lib/colors";
import { addDays, today } from "@/lib/dates";

const HABITS = ["Workout", "Read", "Study DSA", "Drink water", "Meditation", "Sleep before 11 PM"];

// A couple of habits get subtasks so partial days show up in the grid.
const SUBTASKS: Record<string, string[]> = {
  Workout: ["Warm up", "Main lift", "Stretch"],
  "Study DSA": ["Review notes", "Solve two problems"],
};

// Rough weekly rhythms — how likely each habit is to get done, by weekday.
const CADENCE: Record<string, number[]> = {
  Workout: [0.9, 0.35, 0.9, 0.5, 0.85, 0.7, 0.3],
  Read: [0.7, 0.75, 0.6, 0.8, 0.5, 0.85, 0.9],
  "Study DSA": [0.85, 0.8, 0.75, 0.8, 0.6, 0.35, 0.25],
  "Drink water": [0.95, 0.9, 0.95, 0.9, 0.85, 0.7, 0.75],
  Meditation: [0.6, 0.55, 0.6, 0.5, 0.45, 0.7, 0.8],
  "Sleep before 11 PM": [0.7, 0.65, 0.6, 0.55, 0.2, 0.25, 0.7],
};

const NOTES: Record<string, string[]> = {
  Workout: [
    "Leg day. Increased squat weight to 80kg.",
    "Easy 5k, legs still sore from Monday.",
    "Push day — bench finally moved past the plateau.",
    "Short session, 25 minutes, but showed up.",
  ],
  Read: [
    "Finished 40 pages. The middle section drags.",
    "Read on the balcony before the heat set in.",
    "Two chapters. Took notes on the argument in ch. 7.",
  ],
  "Study DSA": [
    "Two graph problems. Union-find finally clicked.",
    "Sliding window set. Got 3 of 4 without hints.",
    "Reviewed yesterday's mistakes instead of new problems.",
  ],
  Meditation: ["Ten minutes, mostly restless.", "Twenty minutes. Much calmer afterwards."],
  "Drink water": ["Three full bottles.", "Kept the bottle on the desk — that's the whole trick."],
  "Sleep before 11 PM": ["Lights out at 10:40.", "Close — 11:10, but no screens after 10."],
};

/** A small generated image, so photo handling can be exercised without assets. */
function makePhoto(label: string, seed: number): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext("2d")!;
  const hue = (seed * 47) % 360;
  ctx.fillStyle = `hsl(${hue}, 24%, 82%)`;
  ctx.fillRect(0, 0, 640, 420);
  ctx.fillStyle = `hsl(${(hue + 40) % 360}, 30%, 62%)`;
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(60 + i * 110, 420 - 60 - ((seed * (i + 3)) % 240), 70, 400);
  }
  ctx.fillStyle = "rgba(35,30,26,0.75)";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText(label, 40, 62);
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => resolve(new File([blob!], `${label.toLowerCase().replace(/\W+/g, "-")}.jpg`, { type: "image/jpeg" })),
      "image/jpeg",
      0.82,
    ),
  );
}

// Deterministic pseudo-random so a reseed looks the same.
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export async function seedDemoData(days = 38) {
  const habits = await Promise.all(
    HABITS.map((name, i) => store.createHabit(name, COLOR_PRESETS[i % COLOR_PRESETS.length].hex)),
  );

  const subtasksByHabit: Record<string, string[]> = {};
  for (const habit of habits) {
    const names = SUBTASKS[habit.name] ?? [];
    const created = [];
    for (const name of names) created.push(await store.createSubtask(habit.id, name));
    subtasksByHabit[habit.id] = created.map((s) => s.id);
  }
  const start = addDays(today(), -(days - 1));
  let photoBudget = 6;
  let seed = 1;

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const date = addDays(start, dayIndex);
    const weekday = (new Date(date.slice(0, 4) + "/" + date.slice(5, 7) + "/" + date.slice(8, 10)).getDay() + 6) % 7;

    for (const habit of habits) {
      seed += 1;
      const chance = CADENCE[habit.name]?.[weekday] ?? 0.6;
      if (rand(seed) > chance) continue;

      const noteOptions = NOTES[habit.name] ?? [];
      const wantsNote = noteOptions.length > 0 && rand(seed + 0.3) < 0.28;
      const wantsPhoto = photoBudget > 0 && rand(seed + 0.6) < 0.06;

      let photoPath: string | null = null;
      if (wantsPhoto) {
        photoBudget -= 1;
        const file = await makePhoto(`${habit.name} · ${date}`, seed);
        photoPath = await store.uploadPhoto(file, habit.id, date);
      }

      // Habits with subtasks land on a partial day now and then.
      const subtaskIds = subtasksByHabit[habit.id] ?? [];
      let doneSubtasks = subtaskIds;
      if (subtaskIds.length > 0 && rand(seed + 1.4) < 0.35) {
        const keep = 1 + Math.floor(rand(seed + 1.7) * (subtaskIds.length - 1));
        doneSubtasks = subtaskIds.slice(0, keep);
      }

      await store.upsertEntry({
        habit_id: habit.id,
        date,
        completed: subtaskIds.length === 0 || doneSubtasks.length === subtaskIds.length,
        completed_subtasks: doneSubtasks,
        note: wantsNote ? noteOptions[Math.floor(rand(seed + 0.9) * noteOptions.length)] : null,
        photo_paths: photoPath ? [photoPath] : [],
        subtask_photos: {},
      });
    }
  }
}
