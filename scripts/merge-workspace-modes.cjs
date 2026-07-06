const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const LIGHT_DIR = path.resolve(process.cwd(), "artifacts", "workspace-videos-light");
const DARK_DIR = path.resolve(process.cwd(), "artifacts", "workspace-videos-dark");
const OUTPUT_DIR = path.resolve(process.cwd(), "artifacts", "workspace-videos-all-colour");
const TRANSITION_SECONDS = 0.75;
const DARK_ENTRY_OFFSET_SECONDS = 0.90;

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

async function probeDuration(filePath) {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { maxBuffer: 1024 * 1024 }
  );
  return Number.parseFloat(stdout.trim());
}

async function mergePair(name) {
  const lightPath = path.join(LIGHT_DIR, `${name}.mp4`);
  const darkPath = path.join(DARK_DIR, `${name}.mp4`);
  const outputPath = path.join(OUTPUT_DIR, `${name}.mp4`);
  const lightDuration = await probeDuration(lightPath);
  const offset = Math.max(0.15, lightDuration - TRANSITION_SECONDS);

  await execFileAsync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-nostats",
      "-y",
      "-i",
      lightPath,
      "-i",
      darkPath,
      "-filter_complex",
      [
        "[0:v]scale=1440:900:force_original_aspect_ratio=decrease,",
        "pad=1440:900:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setpts=PTS-STARTPTS,fps=30[v0];",
        "[1:v]scale=1440:900:force_original_aspect_ratio=decrease,",
        `pad=1440:900:(ow-iw)/2:(oh-ih)/2,format=yuv420p,trim=start=${DARK_ENTRY_OFFSET_SECONDS},setpts=PTS-STARTPTS,fps=30[v1];`,
        `[v0][v1]xfade=transition=fade:duration=${TRANSITION_SECONDS}:offset=${offset}[v]`,
      ].join(""),
      "-map",
      "[v]",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "medium",
      "-crf",
      "20",
      outputPath,
    ],
    { maxBuffer: 8 * 1024 * 1024 }
  );

  return outputPath;
}

async function main() {
  await ensureCleanDir(OUTPUT_DIR);
  const outputs = [];
  for (const name of sections) {
    const output = await mergePair(name);
    outputs.push(output);
    console.log(`merged ${name} -> ${output}`);
  }

  console.log("\ncompleted merged recordings:");
  for (const output of outputs) {
    console.log(output);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
