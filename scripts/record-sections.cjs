const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { chromium } = require("playwright");

const execFileAsync = promisify(execFile);

const BASE_URL = process.env.SECTIONS_BASE_URL || "http://localhost:3002";
const THEME = process.env.SECTIONS_THEME || "light";
const THEME_STORAGE_KEY = "COGNO_THEME";
const TRIM_START_SECONDS = "1.20";
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  "artifacts",
  THEME === "dark" ? "section-videos-dark" : "section-videos"
);
const TEMP_VIDEO_DIR = path.resolve(
  process.cwd(),
  "artifacts",
  THEME === "dark" ? ".tmp-section-videos-dark" : ".tmp-section-videos"
);

const sections = [
  { name: "00-auth-entry", route: "/", authenticated: false },
  { name: "01-dashboard", route: "/", authenticated: true },
  { name: "02-tasks-matrix", route: "/tasks", authenticated: true },
  { name: "03-planner", route: "/planner", authenticated: true },
  { name: "04-notes", route: "/notes", authenticated: true },
  { name: "05-wellness", route: "/wellness", authenticated: true },
  { name: "06-health-predict", route: "/health-predict", authenticated: true },
  { name: "07-ultra-agent", route: "/ultra", authenticated: true },
  { name: "08-brain-training", route: "/brain-training", authenticated: true },
  { name: "09-fitness-tracker", route: "/fitness", authenticated: true },
  { name: "10-platform-settings", route: "/settings", authenticated: true },
];

async function ensureDirs() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(TEMP_VIDEO_DIR, { recursive: true });
}

async function cleanTempDir() {
  await fs.rm(TEMP_VIDEO_DIR, { recursive: true, force: true });
  await fs.mkdir(TEMP_VIDEO_DIR, { recursive: true });
}

async function softPan(page) {
  await page.waitForTimeout(1200);
  await page.mouse.move(900, 260);
  await page.waitForTimeout(400);
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, -180);
  await page.waitForTimeout(900);
}

async function waitForTheme(page) {
  await page.waitForFunction(
    (expectedTheme) => document.documentElement.classList.contains(expectedTheme),
    THEME,
    { timeout: 10000 }
  );
  await page.waitForTimeout(900);
}

async function trimVideo(sourcePath, destinationPath) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-nostats",
    "-ss",
    TRIM_START_SECONDS,
    "-i",
    sourcePath,
    "-an",
    "-c",
    "copy",
    destinationPath,
  ]);
}

async function recordSection(browser, section) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: THEME === "dark" ? "dark" : "light",
    recordVideo: {
      dir: TEMP_VIDEO_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  await context.addInitScript(
    ({ authenticated, theme, themeStorageKey }) => {
      window.localStorage.setItem(themeStorageKey, theme);
      if (authenticated) {
        window.localStorage.setItem("COGNO_DEMO_AUTH", "true");
        window.localStorage.setItem("COGNO_AUTH_METHOD", "local");
      } else {
        window.localStorage.removeItem("COGNO_DEMO_AUTH");
        window.localStorage.removeItem("COGNO_AUTH_METHOD");
      }
    },
    {
      authenticated: section.authenticated,
      theme: THEME,
      themeStorageKey: THEME_STORAGE_KEY,
    }
  );

  const page = await context.newPage();
  await page.goto(`${BASE_URL}${section.route}`, { waitUntil: "networkidle" });
  await waitForTheme(page);
  await softPan(page);
  await page.waitForTimeout(1500);

  const video = page.video();
  await context.close();

  const sourcePath = await video.path();
  const destinationPath = path.join(OUTPUT_DIR, `${section.name}.webm`);
  await trimVideo(sourcePath, destinationPath);

  return destinationPath;
}

async function main() {
  await ensureDirs();
  await cleanTempDir();

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const outputs = [];
    for (const section of sections) {
      const output = await recordSection(browser, section);
      outputs.push(output);
      console.log(`recorded ${section.name} -> ${output}`);
    }

    console.log(`\nmode: ${THEME}`);
    console.log("\ncompleted recordings:");
    for (const output of outputs) {
      console.log(output);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
