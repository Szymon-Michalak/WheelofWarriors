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

export function createMessageController({ goalTextEl, shoutoutTextEl, getNames }) {
  let sprintGoals = [];
  let shoutoutTemplates = [];

  function setSprintGoal() {
    if (!goalTextEl) return;
    if (!sprintGoals.length) {
      goalTextEl.textContent = "Add goals to data/sprint-goals.txt";
      return;
    }
    const goal = sprintGoals[Math.floor(Math.random() * sprintGoals.length)];
    goalTextEl.textContent = goal;
  }

  function setShoutout(fixedName = null) {
    if (!shoutoutTextEl) return;
    const names = getNames();
    if (!names.length) {
      shoutoutTextEl.textContent = "No warriors on the wheel yet.";
      return;
    }

    if (!shoutoutTemplates.length) {
      shoutoutTextEl.textContent = "Add shoutouts to data/daily-shoutouts.txt";
      return;
    }
    const picked = fixedName ?? names[Math.floor(Math.random() * names.length)];
    const template = shoutoutTemplates[Math.floor(Math.random() * shoutoutTemplates.length)];
    shoutoutTextEl.textContent = template.replaceAll("{name}", picked);
  }

  async function loadSources() {
    try {
      const [goals, shoutouts] = await Promise.all([
        loadLinesFromFile("data/sprint-goals.txt"),
        loadLinesFromFile("data/daily-shoutouts.txt")
      ]);

      sprintGoals = goals;
      shoutoutTemplates = shoutouts;
    } catch {
      sprintGoals = [];
      shoutoutTemplates = [];
    }

    setSprintGoal();
    setShoutout();
  }

  return { loadSources, setSprintGoal, setShoutout };
}
