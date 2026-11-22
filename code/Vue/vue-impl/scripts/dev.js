const args = require("minimist")(process.argv.slice(2), {
  string: ["format"],
  boolean: ["watch"],
  alias: {
    f: "format",
    w: "watch",
  },
  default: {
    format: "global",
    watch: false,
  },
});

const fs = require("node:fs");
const path = require("node:path");
const { build, context } = require("esbuild");

// ==================== Build arguments ====================

const target = args._[0] || "reactivity";
const format = args.format;
const watch = args.watch;

const supportedFormats = ["global", "global.prod", "esm", "cjs"];

// 判断 输出格式是否符合标准
if (!supportedFormats.includes(format)) {
  throw new Error(`Unsupported build format: ${format}`);
}

const packagesDirectory = path.resolve(__dirname, "../packages");
const packageDirectory = path.resolve(packagesDirectory, target);

// Prevent package targets from escaping the workspace.
if (
  packageDirectory === packagesDirectory ||
  !packageDirectory.startsWith(packagesDirectory + path.sep)
) {
  throw new Error(`Invalid package target: ${target}`);
}

// ==================== Package information ====================

const packageJsonPath = path.join(packageDirectory, "package.json");
const entryFile = path.join(packageDirectory, "src/index.ts");

if (!fs.existsSync(packageJsonPath)) {
  throw new Error(`Package not found: ${packageJsonPath}`);
}

if (!fs.existsSync(entryFile)) {
  throw new Error(`Entry file not found: ${entryFile}`);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// ==================== Output configuration ====================

const isGlobal = format.startsWith("global");
const isProduction = format.endsWith(".prod");

const outputFormat = isGlobal ? "iife" : format === "cjs" ? "cjs" : "esm";

const outfile = path.join(packageDirectory, "dist", `${target}.${format}.js`);

const globalName =
  pkg.buildOptions?.name ||
  target.replace(/(^|[-_])([a-z])/g, (_, separator, letter) =>
    letter.toUpperCase(),
  );

// Keep runtime dependencies external for module builds.
// Browser global builds include dependencies in the bundle.
const external = isGlobal
  ? []
  : [
      ...new Set([
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
      ]),
    ];

// ==================== Build options ====================

const buildOptions = {
  entryPoints: [entryFile],
  outfile,

  bundle: true,
  format: outputFormat,
  platform: isGlobal ? "browser" : "neutral",

  target: "es2018",
  sourcemap: !isProduction,
  minify: isProduction,

  external,

  ...(isGlobal ? { globalName } : {}),

  logLevel: "info",

  plugins: [
    {
      name: "build-reporter",
      setup(buildProcess) {
        buildProcess.onEnd((result) => {
          if (result.errors.length > 0) {
            console.error(`[build] Failed: ${target} (${format})`);
            return;
          }

          console.log(`[build] Success: ${target} (${format})`);
          console.log(`[build] Output: ${outfile}`);
        });
      },
    },
  ],
};

// ==================== Build execution ====================

async function runBuild() {
  if (!watch) {
    // Perform a single build and exit.
    await build(buildOptions);
    return;
  }

  // Create a reusable build context for incremental rebuilds.
  const ctx = await context(buildOptions);

  // Watch imported source files and rebuild after changes.
  await ctx.watch();

  console.log(`[watch] Watching ${target} (${format})`);

  // Release the build context when the process is terminated.
  const stop = async () => {
    await ctx.dispose();
    process.exit(0);
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

runBuild().catch((error) => {
  console.error("[build] Build process failed:", error);
  process.exitCode = 1;
});
