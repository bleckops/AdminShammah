import type { Timestamp } from "firebase/firestore";

export type EventType =
  | "birthdays"
  | "retreat"
  | "camp"
  | "prayer"
  | "social"
  | "evangelism"
  | "discipleship";

export type EventRepeat = "single" | "recursive";
export type EventPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: Timestamp;
  time?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  repeat?: EventRepeat | null;
  repeatNumber?: number | null;
  period?: EventPeriod | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface EventRecurrence {
  repeat: EventRepeat;
  repeatNumber: number | null;
  period: EventPeriod | null;
}

const PERIOD_LABELS: Record<EventPeriod, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

export const EVENT_PERIODS: EventPeriod[] = ["daily", "weekly", "monthly", "yearly"];

export function normalizeRecurrence(event: Pick<Event, "type" | "repeat" | "repeatNumber" | "period">): EventRecurrence {
  if (event.type === "birthdays" && !event.repeat) {
    return { repeat: "recursive", repeatNumber: null, period: "yearly" };
  }

  if (event.repeat === "recursive" && event.period && EVENT_PERIODS.includes(event.period)) {
    const rawRepeatNumber = event.repeatNumber;
    const repeatNumber = rawRepeatNumber === null ? null : Number(rawRepeatNumber);
    return {
      repeat: "recursive",
      repeatNumber: repeatNumber !== null && Number.isInteger(repeatNumber) && repeatNumber > 0 ? repeatNumber : null,
      period: event.period,
    };
  }

  return { repeat: "single", repeatNumber: null, period: null };
}

export function recurrenceLabel(event: Pick<Event, "type" | "repeat" | "repeatNumber" | "period">): string | null {
  const recurrence = normalizeRecurrence(event);
  if (recurrence.repeat !== "recursive" || !recurrence.period) return null;

  const frequency = `Every ${PERIOD_LABELS[recurrence.period]}`;
  return recurrence.repeatNumber === null
    ? `${frequency} · Unlimited`
    : `${frequency} · ${recurrence.repeatNumber} occurrences`;
}

function isSameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function occurrenceDate(start: Date, index: number, period: EventPeriod) {
  const date = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  if (period === "daily") date.setDate(date.getDate() + index);
  if (period === "weekly") date.setDate(date.getDate() + (index * 7));
  if (period === "monthly") {
    const targetMonth = start.getMonth() + index;
    const targetYear = start.getFullYear() + Math.floor(targetMonth / 12);
    const month = ((targetMonth % 12) + 12) % 12;
    date.setFullYear(targetYear, month, Math.min(start.getDate(), daysInMonth(targetYear, month)));
  }
  if (period === "yearly") {
    const targetYear = start.getFullYear() + index;
    date.setFullYear(targetYear, start.getMonth(), Math.min(start.getDate(), daysInMonth(targetYear, start.getMonth())));
  }

  return date;
}

export function eventMatchesDay(event: Pick<Event, "type" | "date" | "repeat" | "repeatNumber" | "period">, dayDate: Date) {
  if (!event.date) return false;

  const start = event.date.toDate();
  const recurrence = normalizeRecurrence(event);

  if (recurrence.repeat === "single") return isSameDay(start, dayDate);
  if (event.type === "birthdays" && recurrence.repeatNumber === null && recurrence.period === "yearly") {
    return dayDate.getFullYear() >= start.getFullYear()
      && dayDate.getMonth() === start.getMonth()
      && dayDate.getDate() === Math.min(start.getDate(), daysInMonth(dayDate.getFullYear(), start.getMonth()));
  }
  if (!recurrence.period) return false;

  const count = recurrence.repeatNumber ?? 0;
  for (let index = 0; index < count; index += 1) {
    if (isSameDay(occurrenceDate(start, index, recurrence.period), dayDate)) return true;
  }
  return false;
}
