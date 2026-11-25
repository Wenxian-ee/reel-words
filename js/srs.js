// Spaced repetition (simplified SM-2)
// Grades: 0 Again · 1 Hard · 2 Good · 3 Easy
export const MIN = 60 * 1000;
export const DAY = 24 * 60 * MIN;

export function newSrs(now = Date.now()) {
  return { due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0, last: null };
}

export function grade(srs, q, now = Date.now()) {
  let { interval, ease, reps, lapses } = { ...newSrs(now), ...srs };
  let due;

  if (q === 0) {
    reps = 0;
    lapses += 1;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    due = now + 10 * MIN;
  } else {
    if (reps === 0) interval = [0, 1, 1, 3][q];
    else if (reps === 1) interval = [0, 2, 3, 6][q];
    else interval = Math.round(interval * [0, 1.2, ease, ease * 1.3][q]);
    interval = Math.max(1, interval);
    ease = Math.max(1.3, ease + [0, -0.15, 0, 0.15][q]);
    reps += 1;
    due = now + interval * DAY;
  }
  return { due, interval, ease: Math.round(ease * 100) / 100, reps, lapses, last: now };
}

export function previewInterval(srs, q) {
  const now = Date.now();
  const next = grade(srs, q, now);
  return formatSpan(next.due - now);
}

export function formatSpan(ms) {
  if (ms < 60 * MIN) return Math.max(1, Math.round(ms / MIN)) + ' min';
  if (ms < DAY) return Math.round(ms / (60 * MIN)) + ' h';
  const d = Math.round(ms / DAY);
  if (d < 30) return d + (d === 1 ? ' day' : ' days');
  if (d < 365) return Math.round(d / 30) + ' mo';
  return (d / 365).toFixed(1).replace(/\.0$/, '') + ' yr';
}

export function statusOf(srs) {
  if (!srs || (!srs.last && !srs.reps)) return 'new';
  if (srs.interval >= 21) return 'mastered';
  return 'learning';
}

export function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function isDue(srs) {
  return !srs || srs.due <= endOfToday();
}
