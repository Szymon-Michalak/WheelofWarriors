function parseTextList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

async function loadLinesFromFile(fileName) {
  const response = await fetch(fileName, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load ${fileName}`);
  const text = await response.text();
  return parseTextList(text);
}

async function loadTextFromFirst(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.text();
    } catch {
      // try next path
    }
  }
  throw new Error("Could not load any source path");
}

function parseTimeToMs(value) {
  const raw = value.trim().replace(",", ".");
  if (!raw) return null;

  if (raw.includes(":")) {
    const [minText, secText] = raw.split(":");
    const minutes = Number(minText);
    const seconds = Number(secText);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    return Math.round((minutes * 60 + seconds) * 1000);
  }

  const seconds = Number(raw);
  if (!Number.isFinite(seconds)) return null;
  return Math.round(seconds * 1000);
}

function parseDateToMs(value) {
  const raw = value.trim();
  if (!raw) return null;

  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return direct;

  const dmyDots = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyDots) {
    const [, d, m, y] = dmyDots;
    return Date.UTC(Number(y), Number(m) - 1, Number(d));
  }

  const dmyDashes = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDashes) {
    const [, d, m, y] = dmyDashes;
    return Date.UTC(Number(y), Number(m) - 1, Number(d));
  }

  return null;
}

function parseTimeRow(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const byDash = trimmed.match(
    /^(.*?)\s*-\s*([0-9]+(?::[0-9]{1,2}(?:[.,][0-9]+)?|[.,][0-9]+))\s*-\s*(.+)$/
  );
  if (byDash) return { name: byDash[1].trim(), time: byDash[2].trim(), date: byDash[3].trim() };

  const byDelimiter = trimmed.split(/[;,|\t]/).map((part) => part.trim()).filter(Boolean);
  if (byDelimiter.length >= 3) return { name: byDelimiter[0], time: byDelimiter[1], date: byDelimiter[2] };

  return null;
}

function toDayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatTime(ms) {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDay(dayKey) {
  const dayMs = Date.parse(`${dayKey}T00:00:00Z`);
  if (!Number.isFinite(dayMs)) return dayKey;
  return new Date(dayMs).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildLatestTimeMessage(timesText) {
  const lines = timesText.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const parsed = parseTimeRow(line);
    if (!parsed) continue;

    const ms = parseTimeToMs(parsed.time);
    const achievedAt = parseDateToMs(parsed.date);
    if (ms === null || achievedAt === null) continue;
    return {
      name: parsed.name,
      time: formatTime(ms),
      date: formatDay(toDayKey(achievedAt))
    };
  }
  return null;
}

export function createMessageController({ goalTextEl, latestDailyTextEl }) {
  let sprintGoals = [];
  let previousDailyPb = "";

  function setSprintGoal() {
    if (!goalTextEl) return;
    if (!sprintGoals.length) {
      goalTextEl.textContent = "Add goals to data/sprint-goals.txt";
      return;
    }
    const goal = sprintGoals[Math.floor(Math.random() * sprintGoals.length)];
    goalTextEl.textContent = goal;
  }

  function setPreviousDailyPb() {
    if (!latestDailyTextEl) return;
    if (!previousDailyPb) {
      latestDailyTextEl.textContent = "No valid rows in data/times.txt.";
      return;
    }
    latestDailyTextEl.innerHTML = `
      <span class="latest-head">
        <span class="latest-name">${escapeHtml(previousDailyPb.name)}</span>
        <span class="latest-time-pill">${escapeHtml(previousDailyPb.time)}</span>
      </span>
      <span class="latest-date">${escapeHtml(previousDailyPb.date)}</span>
    `;
  }

  async function loadSources() {
    try {
      const [goals, timesText] = await Promise.all([
        loadLinesFromFile("data/sprint-goals.txt"),
        loadTextFromFirst(["data/times.txt", "./data/times.txt", "/data/times.txt"])
      ]);

      sprintGoals = goals;
      previousDailyPb = buildLatestTimeMessage(timesText);
    } catch {
      sprintGoals = [];
      previousDailyPb = "";
    }

    setSprintGoal();
    setPreviousDailyPb();
  }

  return { loadSources, setSprintGoal, setPreviousDailyPb };
}
