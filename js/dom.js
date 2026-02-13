const hoverTooltip = document.createElement("div");
hoverTooltip.className = "hover-tooltip hidden";
document.body.appendChild(hoverTooltip);

export const els = {
  canvas: document.getElementById("wheelCanvas"),
  rankingList: document.getElementById("rankingList"),
  rankingStatus: document.getElementById("rankingStatus"),
  alarmButton: document.getElementById("alarmButton"),
  goalText: document.getElementById("goalText"),
  shoutoutText: document.getElementById("shoutoutText"),
  winnerModal: document.getElementById("winnerModal"),
  winnerName: document.getElementById("winnerName"),
  winnerClose: document.getElementById("winnerClose"),
  winnerRemove: document.getElementById("winnerRemove"),
  winnerCard: document.querySelector(".winner-card"),
  simCountInput: document.getElementById("simCount"),
  runSimButton: document.getElementById("runSim"),
  simMeta: document.getElementById("simMeta"),
  simResults: document.getElementById("simResults"),
  hoverTooltip
};
