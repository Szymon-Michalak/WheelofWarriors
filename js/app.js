import { els } from "./dom.js";
import { state, palette } from "./state.js";
import { createWheelController, pickWinnerIndex } from "./wheel.js";
import { createMessageController } from "./messages.js";
import { createWinnerModalController } from "./modal.js";
import { createRankingController } from "./ranking.js";
import { createDebugController } from "./debug.js";

const messages = createMessageController({
  goalTextEl: els.goalText,
  shoutoutTextEl: els.shoutoutText,
  getNames: () => state.names
});

const winnerModal = createWinnerModalController({
  winnerModal: els.winnerModal,
  winnerName: els.winnerName,
  winnerCopy: els.winnerCopy,
  winnerClose: els.winnerClose,
  winnerRemove: els.winnerRemove,
  winnerCard: els.winnerCard,
  onRemove: (winner) => {
    if (!winner || state.names.length <= 1) return;
    const index = state.names.indexOf(winner);
    if (index >= 0) state.names.splice(index, 1);
    messages.setShoutout();
    wheel.drawWheel();
  }
});

const wheel = createWheelController({
  canvas: els.canvas,
  hintCanvas: els.hintCanvas,
  names: state.names,
  palette,
  onSpinStart: () => winnerModal.hideWinnerModal(),
  onWinner: (winner) => {
    messages.setShoutout(winner);
    winnerModal.showWinnerModal(winner);
  }
});

const ranking = createRankingController({
  rankingList: els.rankingList,
  hoverTooltip: els.hoverTooltip
});

const debug = createDebugController({
  simCountInput: els.simCountInput,
  runSimButton: els.runSimButton,
  simMeta: els.simMeta,
  simResults: els.simResults,
  getNames: () => state.names,
  pickWinnerIndex
});

function refreshAlarmTargetOptions() {
  if (!els.alarmTargetSelect) return;

  const defaultTarget = "Jędrzej";
  const uniqueNames = [...new Set(state.names)];
  const names = uniqueNames.includes(defaultTarget)
    ? uniqueNames
    : [defaultTarget, ...uniqueNames.filter((name) => name !== defaultTarget)];

  const current = els.alarmTargetSelect.value || defaultTarget;
  els.alarmTargetSelect.innerHTML = "";

  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    els.alarmTargetSelect.appendChild(option);
  }

  els.alarmTargetSelect.value = names.includes(current) ? current : defaultTarget;
}

refreshAlarmTargetOptions();

els.canvas.addEventListener("click", () => wheel.spin());
window.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    wheel.spin();
  }
});

if (els.alarmButton) {
  els.alarmButton.addEventListener("click", () => {
    els.alarmButton.classList.add("armed");
    setTimeout(() => els.alarmButton.classList.remove("armed"), 180);

    const forcedName = els.alarmTargetSelect?.value?.trim() || "Jędrzej";
    state.names.fill(forcedName);
    messages.setShoutout(forcedName);
    wheel.spin(true);
  });
}

wheel.drawWheel();
ranking.loadRanking();
ranking.setupTooltipHandlers();
messages.loadSources();
debug.setup();
