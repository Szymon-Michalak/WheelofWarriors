export function createWinnerModalController({ winnerModal, winnerName, winnerClose, winnerRemove, winnerCard, onRemove }) {
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

  return { showWinnerModal, hideWinnerModal };
}
