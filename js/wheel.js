export function pickWinnerIndex(names) {
  if (!names.length) return -1;
  return Math.floor(Math.random() * names.length);
}

export function createWheelController({ canvas, hintCanvas, names, palette, onSpinStart, onWinner }) {
  const ctx = canvas.getContext("2d");
  const hintCtx = hintCanvas ? hintCanvas.getContext("2d") : null;
  const soundEnabled = true;

  const size = canvas.width;
  const center = size / 2;
  const radius = size * 0.46;
  const innerDisk = size * 0.19;
  const pointerAngle = 0;
  const wheelCacheCanvas = document.createElement("canvas");
  wheelCacheCanvas.width = size;
  wheelCacheCanvas.height = size;
  const wheelCacheCtx = wheelCacheCanvas.getContext("2d");

  const centerLogo = new Image();
  centerLogo.src = "warriors-logo.png";

  let centerLogoLoaded = false;
  let wheelCacheKey = "";
  let rotation = -Math.PI / 2;
  let spinning = false;
  let spinRunId = 0;
  let tickLock = false;
  let lastTickIndex = 0;
  let audioCtx = null;
  let idleRafId = 0;
  let idleLastTs = 0;
  let idleEnabled = true;
  let hintsVisible = true;

  const idleAngularSpeed = (Math.PI * 2) / 42;

  centerLogo.onload = () => {
    centerLogoLoaded = true;
    drawWheel();
  };

  function textColor(hex) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum < 0.55 ? "#f6f6f6" : "#111";
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

  function currentIndex() {
    return indexAtRotation(rotation);
  }

  function drawArcText(text, arcRadius, centerAngle, direction, rotationOffset, font, drawCtx) {
    const letters = [...text];

    drawCtx.save();
    drawCtx.fillStyle = "#fff";
    drawCtx.font = font;
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.shadowColor = "rgba(0, 0, 0, 0.42)";
    drawCtx.shadowBlur = 10;
    drawCtx.shadowOffsetY = 5;
    drawCtx.lineWidth = 4;
    drawCtx.strokeStyle = "rgba(9, 18, 34, 0.5)";

    const letterSpacingPx = 2;
    const widths = letters.map((letter) => drawCtx.measureText(letter).width);
    const totalWidth =
      widths.reduce((sum, width) => sum + width, 0) + letterSpacingPx * Math.max(letters.length - 1, 0);
    const maxArcSpan = 1.95;
    const availableArc = maxArcSpan * arcRadius;
    const fitScale = totalWidth > availableArc ? availableArc / totalWidth : 1;
    const totalAngle = (totalWidth * fitScale) / arcRadius;

    let cursor = centerAngle - direction * totalAngle * 0.5;
    for (let i = 0; i < letters.length; i++) {
      const charWidth = widths[i] * fitScale;
      const halfAdvance = (charWidth / arcRadius) * 0.5 * direction;
      cursor += halfAdvance;

      drawCtx.save();
      drawCtx.rotate(cursor);
      drawCtx.translate(arcRadius, 0);
      drawCtx.rotate(rotationOffset);
      if (fitScale !== 1) drawCtx.scale(fitScale, fitScale);
      drawCtx.strokeText(letters[i], 0, 0);
      drawCtx.fillText(letters[i], 0, 0);
      drawCtx.restore();

      const spacing = i < letters.length - 1 ? letterSpacingPx * fitScale : 0;
      cursor += ((charWidth + spacing) / arcRadius) * 0.5 * direction;
    }

    drawCtx.restore();
  }

  function drawHintLayer() {
    if (!hintCtx) return;

    hintCtx.clearRect(0, 0, size, size);
    hintCtx.save();
    hintCtx.translate(center, center);

    drawArcText("Click to spin", radius * 0.54, -Math.PI / 2, 1, Math.PI / 2, "900 76px 'Avenir Next', sans-serif", hintCtx);
    drawArcText(
      "or press ctrl+enter",
      radius * 0.69,
      Math.PI / 2,
      -1,
      -Math.PI / 2,
      "900 68px 'Avenir Next', sans-serif",
      hintCtx
    );

    hintCtx.restore();
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

    drawCtx.restore();
  }

  function drawWheel() {
    const cacheKey = `${names.join("\u0001")}|${centerLogoLoaded ? 1 : 0}`;
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

  function playTick() {
    if (!soundEnabled || tickLock) return;

    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    tickLock = true;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const highpass = audioCtx.createBiquadFilter();

    osc.type = "triangle";
    const base = 1160 + Math.random() * 90;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, now + 0.018);

    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(650, now);
    highpass.Q.value = 0.55;

    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.036, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);

    osc.connect(gain);
    gain.connect(highpass);
    highpass.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.028);

    setTimeout(() => {
      tickLock = false;
    }, 18);
  }

  function spin(force = false) {
    if (names.length === 0) return;
    if (spinning && !force) return;

    if (hintsVisible && hintCtx) {
      hintCtx.clearRect(0, 0, size, size);
      if (hintCanvas) hintCanvas.style.display = "none";
      hintsVisible = false;
    }

    if (idleRafId) {
      cancelAnimationFrame(idleRafId);
      idleRafId = 0;
      idleLastTs = 0;
    }

    spinRunId += 1;
    const runId = spinRunId;
    spinning = true;
    if (onSpinStart) onSpinStart();

    const startRotation = rotation;
    const segmentAngle = getSegmentAngle();
    const extraTurns = 5 + Math.random() * 2;
    const winnerIndex = pickWinnerIndex(names);
    const winnerAtStop = names[winnerIndex];

    const fullTurn = Math.PI * 2;
    const desiredAbs = pointerAngle - (winnerIndex + 0.5) * segmentAngle;
    const currentNorm = normalizeAngle(startRotation);
    const desiredNorm = normalizeAngle(desiredAbs);
    const deltaToDesired = (desiredNorm - currentNorm + fullTurn) % fullTurn;
    let target = startRotation + extraTurns * fullTurn + deltaToDesired;

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
      idleEnabled = false;
      if (onWinner) onWinner(winnerAtStop ?? "Unknown");
    }

    requestAnimationFrame(frame);
  }

  function idleFrame(ts) {
    if (!idleEnabled || spinning) {
      idleRafId = 0;
      idleLastTs = 0;
      return;
    }

    if (!idleLastTs) idleLastTs = ts;
    const dt = Math.min(48, ts - idleLastTs);
    idleLastTs = ts;

    rotation += idleAngularSpeed * (dt / 1000);
    drawWheel();

    idleRafId = requestAnimationFrame(idleFrame);
  }

  function ensureIdleSpin() {
    if (idleRafId) return;
    idleRafId = requestAnimationFrame(idleFrame);
  }

  ensureIdleSpin();
  drawHintLayer();

  return { drawWheel, spin };
}
