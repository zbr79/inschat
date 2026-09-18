import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "playwright";

const port = Number(process.env.LIGHTHOUSE_PORT ?? 3101);
const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? `http://127.0.0.1:${port}`;
const routes = (
  process.env.LIGHTHOUSE_ROUTES ??
  "/,/records,/records/full,/calls,/models,/opencode,/opencode-calls,/login,/signup"
)
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
const formFactors = (
  process.env.LIGHTHOUSE_FORM_FACTORS ?? "mobile"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const outputDir = path.resolve("artifacts/lighthouse");
const categories = ["performance", "accessibility", "best-practices", "seo"];
const minimums = {
  performance: Number(process.env.LIGHTHOUSE_MIN_PERFORMANCE ?? 0.4),
  accessibility: Number(process.env.LIGHTHOUSE_MIN_ACCESSIBILITY ?? 0.8),
  "best-practices": Number(process.env.LIGHTHOUSE_MIN_BEST_PRACTICES ?? 0.8),
  seo: Number(process.env.LIGHTHOUSE_MIN_SEO ?? 0.8),
};
const responsiveAuditIds = [
  "viewport",
  "viewport-insight",
  "content-width",
  "tap-targets",
  "target-size",
  "font-size",
  "meta-viewport",
  "uses-responsive-images",
  "image-size-responsive",
  "unsized-images",
  "image-aspect-ratio",
];

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function routeFileName(route) {
  return route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");
}

function settingsFor(formFactor) {
  if (formFactor === "desktop") {
    return {
      formFactor: "desktop",
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
      },
      throttlingMethod: "provided",
    };
  }
  return {
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
    },
    throttlingMethod: "provided",
  };
}

function scoreOf(audit) {
  if (!audit || audit.scoreDisplayMode === "notApplicable" || audit.scoreDisplayMode === "informative") {
    return null;
  }
  return typeof audit.score === "number" ? audit.score : null;
}

function extractAudits(lhr, ids) {
  return Object.fromEntries(
    ids
      .map((id) => {
        const audit = lhr.audits[id];
        if (!audit) return null;
        return [
          id,
          {
            title: audit.title,
            score: scoreOf(audit),
            displayValue: audit.displayValue ?? null,
            scoreDisplayMode: audit.scoreDisplayMode,
            explanation: audit.explanation ?? null,
          },
        ];
      })
      .filter(Boolean)
  );
}

function failedAudits(lhr) {
  return Object.values(lhr.audits)
    .filter((audit) => typeof audit.score === "number" && audit.score < 1)
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      score: audit.score,
      displayValue: audit.displayValue ?? null,
    }))
    .sort((a, b) => a.score - b.score);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const server = spawn("npm", ["run", "start", "--", "-p", String(port)], {
    detached: true,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "inherit",
  });

  let chrome;
  try {
    await waitForServer(baseUrl);
    chrome = await launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
    });

    const summary = [];
    for (const route of routes) {
      for (const formFactor of formFactors) {
        const url = new URL(route, baseUrl).toString();
        const result = await lighthouse(url, {
          port: chrome.port,
          output: ["json", "html"],
          logLevel: "error",
          onlyCategories: categories,
          settings: settingsFor(formFactor),
        });

        if (!result?.lhr) throw new Error(`No Lighthouse result for ${url} (${formFactor})`);

        const scores = Object.fromEntries(
          categories.map((category) => [category, result.lhr.categories[category].score])
        );
        const suffix = formFactors.length > 1 ? `-${formFactor}` : "";
        const stem = `${routeFileName(route)}${suffix}`;
        const reports = Array.isArray(result.report) ? result.report : [result.report];

        summary.push({
          route,
          formFactor,
          scores,
          responsive: extractAudits(result.lhr, responsiveAuditIds),
          failedAudits: failedAudits(result.lhr),
        });

        await fs.writeFile(path.join(outputDir, `${stem}.json`), reports[0]);
        if (reports[1]) {
          await fs.writeFile(path.join(outputDir, `${stem}.html`), reports[1]);
        }

        console.log(
          `${route} [${formFactor}] — ${categories
            .map((category) => `${category} ${Math.round(scores[category] * 100)}`)
            .join(", ")}`
        );
      }
    }

    await fs.writeFile(
      path.join(outputDir, "summary.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          baseUrl,
          routes,
          formFactors,
          minimums,
          results: summary,
        },
        null,
        2
      )
    );

    const failures = summary.flatMap(({ route, formFactor, scores }) =>
      categories
        .filter((category) => scores[category] < minimums[category])
        .map(
          (category) =>
            `${route} [${formFactor}] ${category}=${Math.round(scores[category] * 100)} ` +
            `(minimum ${Math.round(minimums[category] * 100)})`
        )
    );

    if (failures.length > 0) {
      throw new Error(`Lighthouse thresholds failed:\n${failures.join("\n")}`);
    }
  } finally {
    await chrome?.kill();
    if (server.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {}
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
