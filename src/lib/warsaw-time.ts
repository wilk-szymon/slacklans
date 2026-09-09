const WARSAW = "Europe/Warsaw";

const LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function warsawParts(utcMs: number): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WARSAW,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function warsawOffsetMs(utcMs: number): number {
  const wall = warsawParts(utcMs);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  return asUtc - utcMs;
}

function sameWall(a: WallClock, b: WallClock): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/** Parse a `datetime-local` value as Europe/Warsaw. DST gaps return null. */
export function parseWarsawLocal(value: string): Date | null {
  const match = LOCAL_RE.exec(value.trim());
  if (!match) {
    return null;
  }

  const wanted: WallClock = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0"),
  };

  if (
    wanted.month < 1 ||
    wanted.month > 12 ||
    wanted.day < 1 ||
    wanted.day > 31 ||
    wanted.hour > 23 ||
    wanted.minute > 59 ||
    wanted.second > 59
  ) {
    return null;
  }

  const asUtc = Date.UTC(
    wanted.year,
    wanted.month - 1,
    wanted.day,
    wanted.hour,
    wanted.minute,
    wanted.second,
  );
  const offset1 = warsawOffsetMs(asUtc);
  let instant = asUtc - offset1;
  const offset2 = warsawOffsetMs(instant);
  if (offset2 !== offset1) {
    instant = asUtc - offset2;
  }

  if (!sameWall(warsawParts(instant), wanted)) {
    return null;
  }

  return new Date(instant);
}

export function formatWarsaw(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: WARSAW,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
