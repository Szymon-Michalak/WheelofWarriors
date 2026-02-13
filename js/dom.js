const hoverTooltip = document.createElement("div");
hoverTooltip.className = "hover-tooltip hidden";
document.body.appendChild(hoverTooltip);

export const els = {
  canvas: document.getElementById("wheelCanvas"),
  hintCanvas: document.getElementById("wheelHintCanvas"),
  rankingList: document.getElementById("rankingList"),
  alarmButton: document.getElementById("alarmButton"),
  goalText: document.getElementById("goalText"),
  latestDailyText: document.getElementById("latestDailyText"),
  winnerModal: document.getElementById("winnerModal"),
  winnerName: document.getElementById("winnerName"),
  winnerCopy: document.getElementById("winnerCopy"),
  winnerClose: document.getElementById("winnerClose"),
  winnerRemove: document.getElementById("winnerRemove"),
  winnerCard: document.querySelector(".winner-card"),
  simCountInput: document.getElementById("simCount"),
  runSimButton: document.getElementById("runSim"),
  alarmTargetSelect: document.getElementById("alarmTarget"),
  simMeta: document.getElementById("simMeta"),
  simResults: document.getElementById("simResults"),
  hoverTooltip
};
