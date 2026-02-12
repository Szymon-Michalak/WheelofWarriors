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

const size = canvas.width;
const center = size / 2;
const radius = size * 0.46;
const innerDisk = size * 0.19;
const pointerAngle = 0;

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
  const count = 90;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${15 + Math.random() * 70}%`;
    piece.style.setProperty("--dx", `${-160 + Math.random() * 320}px`);
    piece.style.setProperty("--dr", `${-300 + Math.random() * 600}deg`);
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    piece.style.animationDuration = `${760 + Math.random() * 520}ms`;
    winnerModal.appendChild(piece);
    setTimeout(() => piece.remove(), 1600);
  }
}

function drawWheel() {
  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  const segmentAngle = getSegmentAngle();

  for (let i = 0; i < names.length; i++) {
    const start = i * segmentAngle;
    const fill = palette[i % palette.length];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, start + segmentAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.save();
    ctx.rotate(start + segmentAngle / 2);
    ctx.fillStyle = textColor(fill);
    const outerPad = 24;
    const innerPad = 24;
    const available = radius - innerDisk - outerPad - innerPad;
    const targetFont = 58;
    ctx.font = `500 ${targetFont}px 'Trebuchet MS', 'Avenir Next', sans-serif`;
    const widthAtTarget = ctx.measureText(names[i]).width || 1;
    const fitScale = Math.min(1, available / widthAtTarget);
    const fontSize = Math.max(30, Math.floor(targetFont * fitScale));
    ctx.font = `500 ${fontSize}px 'Trebuchet MS', 'Avenir Next', sans-serif`;
    const width = ctx.measureText(names[i]).width;
    const maxAllowed = Math.max(available, 1);
    const safeWidth = Math.min(width, maxAllowed);
    const centerRadius = innerDisk + innerPad + safeWidth / 2;
    ctx.translate(centerRadius, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(names[i], 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, innerDisk + 18, 0, Math.PI * 2);
  ctx.fillStyle = "#2d5fb8";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, innerDisk + 12, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#efb92d";
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, innerDisk, 0, Math.PI * 2);
  ctx.clip();
  if (centerLogoLoaded) {
    ctx.drawImage(centerLogo, -innerDisk, -innerDisk, innerDisk * 2, innerDisk * 2);
  } else {
    ctx.fillStyle = "#234b97";
    ctx.fillRect(-innerDisk, -innerDisk, innerDisk * 2, innerDisk * 2);
  }
  ctx.restore();

  if (showHint) {
    drawArcText("Click to spin", radius * 0.52, -2.32, -0.78, 1, "700 48px 'Avenir Next', sans-serif");
    drawArcText(
      "or press ctrl+enter",
      radius * 0.68,
      0.55,
      2.2,
      -1,
      "700 44px 'Avenir Next', sans-serif"
    );
  }

  ctx.restore();
}

function drawArcText(text, arcRadius, startAngle, endAngle, tangent, font) {
  const letters = [...text];

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  const letterSpacingPx = 1.5;
  const widths = letters.map((letter) => ctx.measureText(letter).width);
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

    ctx.save();
    ctx.rotate(cursor);
    ctx.translate(arcRadius, 0);
    ctx.rotate(tangent * Math.PI / 2);
    if (fitScale !== 1) ctx.scale(fitScale, fitScale);
    ctx.fillText(letters[i], 0, 0);
    ctx.restore();

    const spacing = i < letters.length - 1 ? letterSpacingPx * fitScale : 0;
    cursor += ((charWidth + spacing) / arcRadius) * 0.5 * direction;
  }

  ctx.restore();
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

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const byDash = trimmed.match(/^(.*?)\s*-\s*([0-9]+(?::[0-9]{1,2}(?:[.,][0-9]+)?|[.,][0-9]+))$/);
  if (byDash) return { name: byDash[1].trim(), time: byDash[2].trim() };

  const byDelimiter = trimmed.split(/[;,|\t]/).map((part) => part.trim()).filter(Boolean);
  if (byDelimiter.length >= 2) return { name: byDelimiter[0], time: byDelimiter[1] };

  const bySpace = trimmed.match(/^(.*?)\s+([0-9]+(?::[0-9]{1,2}(?:[.,][0-9]+)?|[.,][0-9]+))$/);
  if (bySpace) return { name: bySpace[1].trim(), time: bySpace[2].trim() };

  return null;
}

function renderRanking(rows) {
  rankingList.innerHTML = "";
  for (const row of rows) {
    const item = document.createElement("li");

    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = row.name;

    const time = document.createElement("span");
    time.className = "rank-time";
    time.textContent = formatTime(row.ms);

    item.append(name, time);
    rankingList.appendChild(item);
  }
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
      if (ms === null) continue;

      const currentBest = bestByName.get(parsed.name);
      if (currentBest === undefined || ms < currentBest) {
        bestByName.set(parsed.name, ms);
      }
    }

    const top = [...bestByName.entries()]
      .map(([name, ms]) => ({ name, ms }))
      .sort((a, b) => a.ms - b.ms || a.name.localeCompare(b.name))
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
