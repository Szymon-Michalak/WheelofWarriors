export function createWinnerModalController({
  winnerModal,
  winnerName,
  winnerCopy,
  winnerClose,
  winnerRemove,
  winnerCard,
  onRemove
}) {
  let lastWinner = null;

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

  function fitFontSize(ctx, text, maxWidth, maxSize, minSize) {
    let size = maxSize;
    while (size > minSize) {
      ctx.font = `900 ${size}px 'Avenir Next', 'Segoe UI', sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    }
    return minSize;
  }

  async function createWinnerImageBlob(name) {
    const exportScale = 2;
    const width = 1400;
    const height = 780;
    const canvas = document.createElement("canvas");
    canvas.width = width * exportScale;
    canvas.height = height * exportScale;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.scale(exportScale, exportScale);

    // striped background from previous export style
    const backdrop = ctx.createLinearGradient(0, 0, width, height);
    backdrop.addColorStop(0, "#40557c");
    backdrop.addColorStop(1, "#0c3c94");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    for (let x = -height; x < width + height; x += 34) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(0, 0, 10, height * 2.2);
      ctx.restore();
    }

    const overlay = ctx.createRadialGradient(width * 0.5, height * 0.28, 120, width * 0.5, height * 0.28, width * 0.9);
    overlay.addColorStop(0, "rgba(12, 60, 148, 0.16)");
    overlay.addColorStop(1, "rgba(10, 18, 34, 0.46)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);

    const cardW = 1180;
    const cardH = 500;
    const cardX = (width - cardW) / 2;
    const cardY = 106;
    const radius = 48;

    // winner card shadow and shell
    ctx.fillStyle = "rgba(9, 18, 34, 0.45)";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY + 12, cardW, cardH, radius);
    ctx.fill();

    const cardBg = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    cardBg.addColorStop(0, "rgba(250, 252, 255, 0.96)");
    cardBg.addColorStop(1, "rgba(237, 243, 252, 0.95)");
    ctx.fillStyle = cardBg;
    ctx.strokeStyle = "rgba(146, 170, 210, 0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.stroke();

    // winner header chip
    const chipLabel = "NASTĘPNE DAILY POPROWADZI";
    const chipLabelSize = fitFontSize(ctx, chipLabel, 430, 62, 30);
    ctx.font = `800 ${chipLabelSize}px 'Avenir Next', 'Segoe UI', sans-serif`;
    const chipTextWidth = ctx.measureText(chipLabel).width;
    const chipW = Math.max(360, Math.min(540, chipTextWidth + 96));
    const chipH = 86;
    const chipX = width / 2 - chipW / 2;
    const chipY = cardY - chipH / 2 + 4;
    const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX, chipY + chipH);
    chipGrad.addColorStop(0, "#40557c");
    chipGrad.addColorStop(1, "#0c3c94");
    ctx.fillStyle = chipGrad;
    ctx.strokeStyle = "rgba(156, 189, 243, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f5f9ff";
    ctx.font = `800 ${chipLabelSize}px 'Avenir Next', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(chipLabel, width / 2, chipY + chipH / 2 + 2);

    // winner name (same look as popup, no action buttons area)
    const nameMaxWidth = cardW - 120;
    const nameSize = fitFontSize(ctx, name, nameMaxWidth, 188, 58);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0c3c94";
    ctx.font = `900 ${nameSize}px 'Avenir Next', 'Segoe UI', sans-serif`;
    ctx.fillText(name, width / 2, cardY + cardH / 2 + 24);

    // generated date (e.g. 13 Feb 2026)
    const generatedDate = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date());
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(236, 243, 255, 0.46)";
    ctx.font = "600 28px 'Avenir Next', 'Segoe UI', sans-serif";
    ctx.fillText(generatedDate, width / 2, height - 28);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to generate image blob"));
      }, "image/png");
    });
  }

  async function copyWinnerImage() {
    if (!lastWinner) return;

    try {
      const blob = await createWinnerImageBlob(lastWinner);

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        winnerCopy.textContent = "Skopiowano";
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `winner-${lastWinner}.png`;
        link.click();
        URL.revokeObjectURL(url);
        winnerCopy.textContent = "Pobrano";
      }
    } catch {
      winnerCopy.textContent = "Błąd";
    }

    setTimeout(() => {
      winnerCopy.textContent = "Kopiuj obrazek";
    }, 1200);
  }

  if (winnerClose) winnerClose.addEventListener("click", hideWinnerModal);
  if (winnerModal) {
    winnerModal.addEventListener("click", (event) => {
      if (event.target === winnerModal) hideWinnerModal();
    });
  }
  if (winnerRemove) {
    winnerRemove.addEventListener("click", () => {
      if (lastWinner && onRemove) onRemove(lastWinner);
      hideWinnerModal();
    });
  }
  if (winnerCopy) winnerCopy.addEventListener("click", copyWinnerImage);

  return { showWinnerModal, hideWinnerModal };
}
