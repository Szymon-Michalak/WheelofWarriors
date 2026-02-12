const names = [
  "Krzysiek",
  "Ewelina",
  "Patryk",
  "Klaudia",
  "Hubert",
  "Konrad",
  "Krzysiek S",
  "Tomasz",
  "Szymon",
  "Wiktoria",
  "Emil",
  "Jedrzej",
  "Joanna",
  "Michal",
  "Kamil",
  "Krzysiek R"
];

const palette = ["#2052b2", "#f4dc8f", "#f5c32e", "#4d699e", "#b48700", "#c4b278"];

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const soundEnabled = true;
const rankingList = document.getElementById("rankingList");
const rankingStatus = document.getElementById("rankingStatus");
const alarmButton = document.getElementById("alarmButton");
const goalText = document.getElementById("goalText");
const shoutoutText = document.getElementById("shoutoutText");
const winnerModal = document.getElementById("winnerModal");
const winnerName = document.getElementById("winnerName");
const winnerClose = document.getElementById("winnerClose");
const winnerRemove = document.getElementById("winnerRemove");
const winnerCard = document.querySelector(".winner-card");
const hoverTooltip = document.createElement("div");
hoverTooltip.className = "hover-tooltip hidden";
document.body.appendChild(hoverTooltip);

const size = canvas.width;
const center = size / 2;
const radius = size * 0.46;
const innerDisk = size * 0.19;
const pointerAngle = 0;
const wheelCacheCanvas = document.createElement("canvas");
wheelCacheCanvas.width = size;
wheelCacheCanvas.height = size;
const wheelCacheCtx = wheelCacheCanvas.getContext("2d");
let wheelCacheKey = "";

let rotation = -Math.PI / 2;
let spinning = false;
let spinRunId = 0;
let tickLock = false;
let lastTickIndex = 0;
let audioCtx = null;
let showHint = true;
let lastWinner = null;
let sprintGoals = [];
let shoutoutTemplates = [];

const centerLogo = new Image();
let centerLogoLoaded = false;
centerLogo.src = "warriors-logo.png";
centerLogo.onload = () => {
  centerLogoLoaded = true;
  drawWheel();
};

const defaultSprintGoals = [
  "being cool",
  "zero blockers",
  "fewer meetings",
  "ship it today",
  "clean handoff",
  "no regressions",
  "beat yesterday",
  "focus mode",
  "quick wins",
  "quality first"
];

const defaultShoutouts = [
  "This day is for {name} - {name} is the best.",
  "{name} keeps the vibe high and the work sharp.",
  "Big respect to {name} for showing up strong.",
  "{name} brings serious warrior energy today.",
  "{name} is unstoppable today."
];

function textColor(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.55 ? "#f6f6f6" : "#111";
}

function setSprintGoal() {
  if (!goalText) return;
  if (!sprintGoals.length) sprintGoals = [...defaultSprintGoals];
  const goal = sprintGoals[Math.floor(Math.random() * sprintGoals.length)];
  goalText.textContent = goal;
}

function setShoutout(fixedName = null) {
  if (!shoutoutText) return;
  if (!names.length) {
    shoutoutText.textContent = "No warriors on the wheel yet.";
    return;
  }
  if (!shoutoutTemplates.length) shoutoutTemplates = [...defaultShoutouts];
  const picked = fixedName ?? names[Math.floor(Math.random() * names.length)];
  const template = shoutoutTemplates[Math.floor(Math.random() * shoutoutTemplates.length)];
  shoutoutText.textContent = template.replaceAll("{name}", picked);
}

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

async function loadGoalAndShoutoutSources() {
  try {
    const [goals, shoutouts] = await Promise.all([
      loadLinesFromFile("sprint-goals.txt"),
      loadLinesFromFile("daily-shoutouts.txt")
    ]);
    sprintGoals = goals.length ? goals : [...defaultSprintGoals];
    shoutoutTemplates = shoutouts.length ? shoutouts : [...defaultShoutouts];
  } catch {
    sprintGoals = [...defaultSprintGoals];
    shoutoutTemplates = [...defaultShoutouts];
  }

  setSprintGoal();
  setShoutout();
}

function getSegmentAngle() {
  return (Math.PI * 2) / Math.max(names.length, 1);
}

function normalizeAngle(angle) {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function indexAtRotation(rotationValue) {
  const segmentAngle = getSegmentAngle();
  const normalized = normalizeAngle(pointerAngle - rotationValue);
  return Math.floor(normalized / segmentAngle);
}

function showWinnerModal(name) {
  lastWinner = name;
  winnerName.textContent = name;
  winnerModal.classList.remove("hidden");
  if (winnerCard) {
    winnerCard.classList.remove("celebrate");
    void winnerCard.offsetWidth;
    winnerCard.classList.add("celebrate");
  }
  launchConfetti();
}

function hideWinnerModal() {
  winnerModal.classList.add("hidden");
}

function launchConfetti() {
  if (!winnerModal) return;

  const colors = ["#ffd84d", "#4ca5ff", "#ff6767", "#5ee68b", "#f7f7ff"];
  const count = 42;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${15 + Math.random() * 70}%`;
    piece.style.setProperty("--dx", `${-160 + Math.random() * 320}px`);
    piece.style.setProperty("--dr", `${-300 + Math.random() * 600}deg`);
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    piece.style.animationDuration = `${700 + Math.random() * 360}ms`;
    fragment.appendChild(piece);
    setTimeout(() => piece.remove(), 1600);
  }

  winnerModal.appendChild(fragment);
}

function drawWheel() {
  const cacheKey = `${names.join("\u0001")}|${showHint ? 1 : 0}|${centerLogoLoaded ? 1 : 0}`;
  if (cacheKey !== wheelCacheKey) {
    renderWheelStatic(wheelCacheCtx);
    wheelCacheKey = cacheKey;
  }

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);
  ctx.drawImage(wheelCacheCanvas, -center, -center, size, size);
  ctx.restore();
}

function renderWheelStatic(drawCtx) {
  drawCtx.clearRect(0, 0, size, size);
  drawCtx.save();
  drawCtx.translate(center, center);

  const segmentAngle = getSegmentAngle();
  for (let i = 0; i < names.length; i++) {
    const start = i * segmentAngle;
    const fill = palette[i % palette.length];

    drawCtx.beginPath();
    drawCtx.moveTo(0, 0);
    drawCtx.arc(0, 0, radius, start, start + segmentAngle);
    drawCtx.closePath();
    drawCtx.fillStyle = fill;
    drawCtx.fill();

    drawCtx.save();
    drawCtx.rotate(start + segmentAngle / 2);
    drawCtx.fillStyle = textColor(fill);
    const outerPad = 24;
    const innerPad = 24;
    const available = radius - innerDisk - outerPad - innerPad;
    const targetFont = 58;
    drawCtx.font = `500 ${targetFont}px 'Trebuchet MS', 'Avenir Next', sans-serif`;
    const widthAtTarget = drawCtx.measureText(names[i]).width || 1;
    const fitScale = Math.min(1, available / widthAtTarget);
    const fontSize = Math.max(30, Math.floor(targetFont * fitScale));
    drawCtx.font = `500 ${fontSize}px 'Trebuchet MS', 'Avenir Next', sans-serif`;
    const width = drawCtx.measureText(names[i]).width;
    const maxAllowed = Math.max(available, 1);
    const safeWidth = Math.min(width, maxAllowed);
    const centerRadius = innerDisk + innerPad + safeWidth / 2;
    drawCtx.translate(centerRadius, 0);
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.fillText(names[i], 0, 0);
    drawCtx.restore();
  }

  drawCtx.beginPath();
  drawCtx.arc(0, 0, radius + 2, 0, Math.PI * 2);
  drawCtx.lineWidth = 6;
  drawCtx.strokeStyle = "rgba(0,0,0,0.18)";
  drawCtx.stroke();

  drawCtx.beginPath();
  drawCtx.arc(0, 0, innerDisk + 18, 0, Math.PI * 2);
  drawCtx.fillStyle = "#2d5fb8";
  drawCtx.fill();

  drawCtx.beginPath();
  drawCtx.arc(0, 0, innerDisk + 12, 0, Math.PI * 2);
  drawCtx.lineWidth = 8;
  drawCtx.strokeStyle = "#efb92d";
  drawCtx.stroke();

  drawCtx.save();
  drawCtx.beginPath();
  drawCtx.arc(0, 0, innerDisk, 0, Math.PI * 2);
  drawCtx.clip();
  if (centerLogoLoaded) {
    drawCtx.drawImage(centerLogo, -innerDisk, -innerDisk, innerDisk * 2, innerDisk * 2);
  } else {
    drawCtx.fillStyle = "#234b97";
    drawCtx.fillRect(-innerDisk, -innerDisk, innerDisk * 2, innerDisk * 2);
  }
  drawCtx.restore();

  if (showHint) {
    drawArcText(
      "Click to spin",
      radius * 0.52,
      -2.32,
      -0.78,
      1,
      "700 48px 'Avenir Next', sans-serif",
      drawCtx
    );
    drawArcText(
      "or press ctrl+enter",
      radius * 0.68,
      0.55,
      2.2,
      -1,
      "700 44px 'Avenir Next', sans-serif",
      drawCtx
    );
  }

  drawCtx.restore();
}

function drawArcText(text, arcRadius, startAngle, endAngle, tangent, font, drawCtx = ctx) {
  const letters = [...text];

  drawCtx.save();
  drawCtx.fillStyle = "#fff";
  drawCtx.font = font;
  drawCtx.textAlign = "center";
  drawCtx.textBaseline = "middle";
  drawCtx.shadowColor = "rgba(0, 0, 0, 0.38)";
  drawCtx.shadowBlur = 8;
  drawCtx.shadowOffsetY = 4;

  const letterSpacingPx = 1.5;
  const widths = letters.map((letter) => drawCtx.measureText(letter).width);
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) + letterSpacingPx * Math.max(letters.length - 1, 0);
  const availableArc = Math.abs(endAngle - startAngle) * arcRadius;
  const fitScale = totalWidth > availableArc ? availableArc / totalWidth : 1;
  const direction = Math.sign(endAngle - startAngle) || 1;

  let cursor = startAngle;
  for (let i = 0; i < letters.length; i++) {
    const charWidth = widths[i] * fitScale;
    const halfAdvance = (charWidth / arcRadius) * 0.5 * direction;
    cursor += halfAdvance;

    drawCtx.save();
    drawCtx.rotate(cursor);
    drawCtx.translate(arcRadius, 0);
    drawCtx.rotate(tangent * Math.PI / 2);
    if (fitScale !== 1) drawCtx.scale(fitScale, fitScale);
    drawCtx.fillText(letters[i], 0, 0);
    drawCtx.restore();

    const spacing = i < letters.length - 1 ? letterSpacingPx * fitScale : 0;
    cursor += ((charWidth + spacing) / arcRadius) * 0.5 * direction;
  }

  drawCtx.restore();
}

function playTick() {
  if (!soundEnabled || tickLock) return;

  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  tickLock = true;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "square";
  osc.frequency.value = 740;
  gain.gain.value = 0.0001;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.11, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
  osc.start(now);
  osc.stop(now + 0.05);

  setTimeout(() => {
    tickLock = false;
  }, 24);
}

function currentIndex() {
  return indexAtRotation(rotation);
}

function spin(force = false) {
  if (names.length === 0) return;
  if (spinning && !force) return;
  spinRunId += 1;
  const runId = spinRunId;
  spinning = true;
  showHint = false;
  hideWinnerModal();

  const startRotation = rotation;
  const segmentAngle = getSegmentAngle();
  const extraTurns = 5 + Math.random() * 2;
  const winnerIndex = Math.floor(Math.random() * names.length);
  const winnerAtStop = names[winnerIndex];

  const fullTurn = Math.PI * 2;
  const desiredAbs = pointerAngle - (winnerIndex + 0.5) * segmentAngle;
  const currentNorm = normalizeAngle(startRotation);
  const desiredNorm = normalizeAngle(desiredAbs);
  const deltaToDesired = (desiredNorm - currentNorm + fullTurn) % fullTurn;
  let target = startRotation + extraTurns * fullTurn + deltaToDesired;

  // Safety correction: if floating point math lands off by a segment, step forward to drawn winner.
  const predicted = indexAtRotation(target);
  if (predicted !== winnerIndex) {
    const stepsForward = (predicted - winnerIndex + names.length) % names.length;
    target += stepsForward * segmentAngle;
  }
  const duration = 4700;
  const started = performance.now();
  lastTickIndex = currentIndex();

  function frame(now) {
    if (runId !== spinRunId) return;

    const t = Math.min((now - started) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    rotation = startRotation + (target - startRotation) * eased;

    const index = currentIndex();
    if (index !== lastTickIndex) {
      playTick();
      lastTickIndex = index;
    }

    drawWheel();

    if (t < 1) {
      requestAnimationFrame(frame);
      return;
    }

    rotation = target;
    drawWheel();
    spinning = false;
    setShoutout(winnerAtStop);
    showWinnerModal(winnerAtStop ?? "Unknown");
  }

  requestAnimationFrame(frame);
}

function triggerAlarmMode() {
  names.fill("Jędrzej");
  rankingStatus.textContent = "Alarm mode: all wheel entries changed to Jędrzej.";
  setShoutout("Jędrzej");
  spin(true);
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

function formatTime(ms) {
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
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

function showTooltip(text, x, y) {
  hoverTooltip.textContent = text;
  hoverTooltip.classList.remove("hidden");
  hoverTooltip.style.left = `${x + 12}px`;
  hoverTooltip.style.top = `${y - 12}px`;
}

function hideTooltip() {
  hoverTooltip.classList.add("hidden");
}

function setupRankingTooltipHandlers() {
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
    const response = await fetch("times.txt", { cache: "no-store" });
    if (!response.ok) throw new Error("Cannot load times.txt");

    const text = await response.text();
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

    renderRanking(top);
    rankingStatus.textContent = top.length
      ? `Loaded ${bestByName.size} unique racers from times.txt`
      : "No valid rows found in times.txt";
  } catch {
    rankingList.innerHTML = "";
    rankingStatus.textContent = "times.txt not found or unreadable.";
  }
}

canvas.addEventListener("click", spin);
window.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    spin();
  }
});
if (alarmButton) {
  alarmButton.addEventListener("click", () => {
    alarmButton.classList.add("armed");
    setTimeout(() => alarmButton.classList.remove("armed"), 180);
    triggerAlarmMode();
  });
}

if (winnerClose) winnerClose.addEventListener("click", hideWinnerModal);
if (winnerModal) {
  winnerModal.addEventListener("click", (event) => {
    if (event.target === winnerModal) hideWinnerModal();
  });
}
if (winnerRemove) {
  winnerRemove.addEventListener("click", () => {
    if (!lastWinner || names.length <= 1) {
      hideWinnerModal();
      return;
    }
    const index = names.indexOf(lastWinner);
    if (index >= 0) names.splice(index, 1);
    hideWinnerModal();
    setShoutout();
    drawWheel();
  });
}

drawWheel();
loadRanking();
loadGoalAndShoutoutSources();
setupRankingTooltipHandlers();
