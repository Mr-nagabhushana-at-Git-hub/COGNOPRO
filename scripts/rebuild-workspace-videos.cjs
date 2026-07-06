const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const SOURCE_LIGHT_DIR = path.resolve(process.cwd(), "artifacts", "section-videos");
const SOURCE_DARK_DIR = path.resolve(process.cwd(), "artifacts", "section-videos-dark");
const OUTPUT_LIGHT_DIR = path.resolve(process.cwd(), "artifacts", "workspace-videos-light");
const OUTPUT_DARK_DIR = path.resolve(process.cwd(), "artifacts", "workspace-videos-dark");

const sections = [
  "01-dashboard",
  "02-tasks-matrix",
  "03-planner",
  "04-notes",
  "05-wellness",
  "06-health-predict",
  "07-ultra-agent",
  "08-brain-training",
  "09-fitness-tracker",
  "10-platform-settings",
];

async function ensureCleanDir(targetDir) {
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
}

async function transcodeTrim(sourcePath, destinationPath, trimStartSeconds) {
  await execFileAsync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-nostats",
      "-y",
      "-i",
      sourcePath,
      "-ss",
      trimStartSeconds,
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

async function buildMode(sourceDir, outputDir, trimStartSeconds, modeName) {
  await ensureCleanDir(outputDir);
  const outputs = [];

  for (const name of sections) {
    const sourcePath = path.join(sourceDir, `${name}.webm`);
    const destinationPath = path.join(outputDir, `${name}.mp4`);
    await transcodeTrim(sourcePath, destinationPath, trimStartSeconds);
    outputs.push(destinationPath);
    console.log(`[${modeName}] rebuilt ${name} -> ${destinationPath}`);
  }

  return outputs;
}

async function main() {
  const lightOutputs = await buildMode(SOURCE_LIGHT_DIR, OUTPUT_LIGHT_DIR, "0.35", "light");
  const darkOutputs = await buildMode(SOURCE_DARK_DIR, OUTPUT_DARK_DIR, "2.50", "dark");

  console.log("\ncompleted rebuilt light videos:");
  for (const output of lightOutputs) console.log(output);

  console.log("\ncompleted rebuilt dark videos:");
  for (const output of darkOutputs) console.log(output);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
