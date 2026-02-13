const defaultNames = [
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
  "Jędrzej",
  "Joanna",
  "Michal",
  "Kamil",
  "Krzysiek R"
];

export const state = {
  names: [...defaultNames]
};

export const palette = ["#fbbb24", "#fcd67c", "#0c3c94", "#a48c54", "#966a02", "#40557c"];

export async function loadInitialNames() {
  for (const path of ["data/names.txt", "./data/names.txt", "/data/names.txt"]) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) continue;
      const text = await response.text();
      const deduped = [];
      const seen = new Set();
      for (const rawLine of text.split(/\r?\n/)) {
        const name = rawLine.trim();
        if (!name || name.startsWith("#")) continue;
        if (seen.has(name)) continue;
        seen.add(name);
        deduped.push(name);
      }
      if (deduped.length) return deduped;
    } catch {
      // try next path
    }
  }
  return [...defaultNames];
}
