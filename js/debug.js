export function createDebugController({ simCountInput, runSimButton, simMeta, simResults, getNames, pickWinnerIndex }) {
  function runRandomnessSimulation(spins) {
    const names = getNames();
    if (!names.length) {
      if (simMeta) simMeta.textContent = "No names on wheel.";
      if (simResults) simResults.innerHTML = "";
      return;
    }

    const countsByName = new Map();
    const occurrences = new Map();
    for (const name of names) {
      countsByName.set(name, 0);
      occurrences.set(name, (occurrences.get(name) ?? 0) + 1);
    }

    const started = performance.now();
    for (let i = 0; i < spins; i++) {
      const winner = names[pickWinnerIndex(names)];
      countsByName.set(winner, (countsByName.get(winner) ?? 0) + 1);
    }
    const elapsed = performance.now() - started;

    const rows = [...countsByName.entries()]
      .map(([name, count]) => {
        const observed = count / spins;
        const expected = (occurrences.get(name) ?? 0) / names.length;
        const delta = observed - expected;
        return { name, count, observed, expected, delta };
      })
      .sort((a, b) => b.observed - a.observed || a.name.localeCompare(b.name));

    if (simMeta) {
      simMeta.textContent = `Ran ${spins.toLocaleString()} spins in ${elapsed.toFixed(1)} ms`;
    }

    if (simResults) {
      simResults.innerHTML = "";
      const fragment = document.createDocumentFragment();
      for (const row of rows) {
        const li = document.createElement("li");
        const observedPct = (row.observed * 100).toFixed(2);
        const expectedPct = (row.expected * 100).toFixed(2);
        const deltaPct = (row.delta * 100).toFixed(2);
        const deltaSigned = row.delta >= 0 ? `+${deltaPct}` : deltaPct;
        li.textContent = `${row.name}: ${observedPct}% (${row.count}) | expected ${expectedPct}% | delta ${deltaSigned}%`;
        fragment.appendChild(li);
      }
      simResults.appendChild(fragment);
    }
  }

  function setup() {
    if (!runSimButton) return;
    runSimButton.addEventListener("click", () => {
      const requested = Number(simCountInput?.value ?? 10000);
      const spins = Number.isFinite(requested) ? Math.max(1000, Math.min(1000000, Math.floor(requested))) : 10000;
      if (simCountInput) simCountInput.value = String(spins);
      runRandomnessSimulation(spins);
    });
  }

  return { setup, runRandomnessSimulation };
}
