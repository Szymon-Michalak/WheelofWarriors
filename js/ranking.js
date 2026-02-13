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

function formatTime(ms) {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

function formatDate(ms) {
  if (ms === null) return "Unknown date";
  return new Date(ms).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function parseLine(line) {
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

export function createRankingController({ rankingList, hoverTooltip }) {
  function renderRanking(rows) {
    rankingList.innerHTML = "";
    for (const row of rows) {
      const item = document.createElement("li");
      const achievedLabel = `Achieved: ${formatDate(row.achievedAt)}`;
      item.dataset.tip = achievedLabel;

      const name = document.createElement("span");
      name.className = "rank-name";
      name.textContent = row.name;

      const time = document.createElement("span");
      time.className = "rank-time";
      time.textContent = formatTime(row.ms);
      time.setAttribute("aria-label", achievedLabel);
      time.tabIndex = 0;

      item.append(name, time);
      rankingList.appendChild(item);
    }
  }

  function renderRankingMessage(message) {
    rankingList.innerHTML = "";
    const item = document.createElement("li");
    item.className = "rank-empty";
    item.textContent = message;
    rankingList.appendChild(item);
  }

  function showTooltip(text, x, y) {
    hoverTooltip.textContent = text;
    hoverTooltip.classList.remove("hidden");
    hoverTooltip.style.left = `${x + 12}px`;
    hoverTooltip.style.top = `${y - 12}px`;
  }

  function hideTooltip() {
    hoverTooltip.classList.add("hidden");
  }

  function setupTooltipHandlers() {
    if (!rankingList) return;

    rankingList.addEventListener("pointermove", (event) => {
      const target = event.target.closest("li");
      if (!target || !target.dataset.tip) {
        hideTooltip();
        return;
      }
      showTooltip(target.dataset.tip, event.clientX, event.clientY);
    });

    rankingList.addEventListener("pointerleave", hideTooltip);

    rankingList.addEventListener("focusin", (event) => {
      const target = event.target.closest("li");
      if (!target || !target.dataset.tip) return;
      const rect = target.getBoundingClientRect();
      showTooltip(target.dataset.tip, rect.right, rect.top);
    });

    rankingList.addEventListener("focusout", hideTooltip);
  }

  async function loadRanking() {
    try {
      let text = "";
      let loaded = false;
      for (const path of ["data/times.txt", "./data/times.txt", "/data/times.txt"]) {
        try {
          const response = await fetch(path, { cache: "no-store" });
          if (!response.ok) continue;
          text = await response.text();
          loaded = true;
          break;
        } catch {
          // keep trying alternative paths
        }
      }
      if (!loaded) throw new Error("Cannot load times file");

      const lines = text.split(/\r?\n/);
      const bestByName = new Map();

      for (const line of lines) {
        const parsed = parseLine(line);
        if (!parsed) continue;

        const ms = parseTimeToMs(parsed.time);
        const achievedAt = parseDateToMs(parsed.date);
        if (ms === null || achievedAt === null) continue;

        const currentBest = bestByName.get(parsed.name);
        if (currentBest === undefined || ms < currentBest.ms || (ms === currentBest.ms && achievedAt < currentBest.achievedAt)) {
          bestByName.set(parsed.name, { ms, achievedAt });
        }
      }

      const top = [...bestByName.entries()]
        .map(([name, data]) => ({ name, ms: data.ms, achievedAt: data.achievedAt }))
        .sort((a, b) => a.ms - b.ms || a.achievedAt - b.achievedAt || a.name.localeCompare(b.name))
        .slice(0, 5);

      if (top.length) renderRanking(top);
      else renderRankingMessage("No valid ranking rows in times file.");
    } catch {
      renderRankingMessage("Could not load ranking data.");
    }
  }

  return { loadRanking, setupTooltipHandlers };
}
