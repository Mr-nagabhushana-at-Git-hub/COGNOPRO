const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { chromium } = require("playwright");

const execFileAsync = promisify(execFile);

const BASE_URL = process.env.SECTIONS_BASE_URL || "http://localhost:3002";
const MODE_FILTER = process.env.SECTIONS_MODE || "";
const SECTION_FILTER = process.env.SECTION_FILTER || "";
const THEME_STORAGE_KEY = "COGNO_THEME";
const VIEWPORT = { width: 1440, height: 900 };
const TRIM_START_SECONDS = "1.20";
const TEMP_ROOT = path.resolve(process.cwd(), "artifacts", ".tmp-workspace-videos");

const sections = [
  { name: "01-dashboard", route: "/" },
  { name: "02-tasks-matrix", route: "/tasks" },
  { name: "03-planner", route: "/planner" },
  { name: "04-notes", route: "/notes" },
  { name: "05-wellness", route: "/wellness" },
  { name: "06-health-predict", route: "/health-predict" },
  { name: "07-ultra-agent", route: "/ultra" },
  { name: "08-brain-training", route: "/brain-training" },
  { name: "09-fitness-tracker", route: "/fitness" },
  { name: "10-platform-settings", route: "/settings" },
];
const selectedSections = SECTION_FILTER
  ? sections.filter((section) => section.name === SECTION_FILTER || section.route === SECTION_FILTER)
  : sections;

const allModes = [
  { id: "light", theme: "light", outputDir: path.resolve(process.cwd(), "artifacts", "workspace-videos-light") },
  { id: "dark", theme: "dark", outputDir: path.resolve(process.cwd(), "artifacts", "workspace-videos-dark") },
];
const modes = MODE_FILTER
  ? allModes.filter((mode) => mode.id === MODE_FILTER)
  : allModes;

async function ensureCleanDir(targetDir) {
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
}

async function ensureParentDirs() {
  await fs.mkdir(path.resolve(process.cwd(), "artifacts"), { recursive: true });
  await fs.mkdir(TEMP_ROOT, { recursive: true });
}

async function waitForTheme(page, theme) {
  await page.waitForFunction(
    (expectedTheme) => document.documentElement.classList.contains(expectedTheme),
    theme,
    { timeout: 10000 }
  );
  await page.waitForTimeout(900);
}

async function waitForSectionReady(page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 2000 });
  } catch {
    // Some pages keep background activity alive; the recorder should still proceed.
  }
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 0, { timeout: 10000 });
}

async function softPan(page) {
  await page.mouse.move(960, 260);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, -220);
  await page.waitForTimeout(850);
}

async function trimVideo(sourcePath, destinationPath) {
  await execFileAsync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-nostats",
      "-y",
      "-ss",
      TRIM_START_SECONDS,
      "-i",
      sourcePath,
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "22",
      destinationPath,
    ],
    { maxBuffer: 8 * 1024 * 1024 }
  );
}

async function recordSection(browser, mode, section) {
  const rawDir = path.join(TEMP_ROOT, mode.id, section.name);
  await ensureCleanDir(rawDir);

  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: mode.theme === "dark" ? "dark" : "light",
    recordVideo: {
      dir: rawDir,
      size: VIEWPORT,
    },
  });

  await context.addInitScript(
    ({ theme, themeStorageKey }) => {
      window.localStorage.setItem("COGNO_DEMO_AUTH", "true");
      window.localStorage.setItem("COGNO_AUTH_METHOD", "local");
      window.localStorage.setItem(themeStorageKey, theme);
    },
    {
      theme: mode.theme,
      themeStorageKey: THEME_STORAGE_KEY,
    }
  );

  const page = await context.newPage();
  await page.goto(`${BASE_URL}${section.route}`, { waitUntil: "domcontentloaded" });
  await waitForSectionReady(page);
  await waitForTheme(page, mode.theme);
  await page.waitForTimeout(700);
  await softPan(page);
  await page.waitForTimeout(1200);

  const video = page.video();
  await context.close();

  const sourcePath = await video.path();
  const destinationPath = path.join(mode.outputDir, `${section.name}.mp4`);
  await trimVideo(sourcePath, destinationPath);
  return destinationPath;
}

async function recordMode(mode) {
  if (SECTION_FILTER) {
    await fs.mkdir(mode.outputDir, { recursive: true });
  } else {
    await ensureCleanDir(mode.outputDir);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const outputs = [];
    for (const section of selectedSections) {
      const output = await recordSection(browser, mode, section);
      outputs.push(output);
      console.log(`[${mode.id}] recorded ${section.name} -> ${output}`);
    }
    return outputs;
  } finally {
    await browser.close();
  }
}

async function main() {
  await ensureParentDirs();

  for (const mode of modes) {
    const outputs = await recordMode(mode);
    console.log(`\ncompleted ${mode.id} recordings:`);
    for (const output of outputs) {
      console.log(output);
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
