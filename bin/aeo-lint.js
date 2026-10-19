#!/usr/bin/env node

/**
 * @cernitur/aeo-lint
 * Answer Engine Optimization (AEO) & Generative Engine Optimization (GEO) CLI Linter
 * 
 * Copyright (c) 2026 Cernitur Technologies LLC
 * Licensed under the Apache-2.0 License
 * Official Website: https://cernitur.com
 */

import { argv, exit } from "node:process";

// ANSI Color Helpers (Zero Dependencies)
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  amber: "\x1b[33m",
  cyan: "\x1b[36m",
  bgAmber: "\x1b[43m\x1b[30m",
  bgGreen: "\x1b[42m\x1b[30m",
  bgRed: "\x1b[41m\x1b[37m",
};

function printHelp() {
  console.log(`
${c.bold}Cernitur AEO Linter (@cernitur/aeo-lint)${c.reset}
Deterministic Answer Engine & Generative Engine Optimization Diagnostic CLI.

${c.bold}USAGE:${c.reset}
  npx @cernitur/aeo-lint <target-domain-or-url> [options]

${c.bold}OPTIONS:${c.reset}
  --json             Output diagnostic results in raw machine-readable JSON
  --threshold <num>  Exit with code 1 if total score is below this threshold (Default: 0)
  --help, -h         Show this manual

${c.bold}EXAMPLES:${c.reset}
  npx @cernitur/aeo-lint cernitur.com
  npx @cernitur/aeo-lint https://example.com --threshold 70
  npx @cernitur/aeo-lint example.com --json > aeo-report.json

${c.dim}Documentation: https://cernitur.com/guides/json-ld-entity-graph${c.reset}
`);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Cernitur-AEOLint/1.0 (+https://cernitur.com/scanner)",
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

function cleanDomain(input) {
  let cleaned = input.trim();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = "https://" + cleaned;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.hostname.toLowerCase();
  } catch {
    return input.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "").toLowerCase();
  }
}

async function inspectRobots(domain) {
  const url = `https://${domain}/robots.txt`;
  const checks = [];
  let score = 0;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      checks.push({ name: "robots.txt accessibility", pass: false, note: `HTTP ${res.status}` });
      return { score: 0, max: 25, checks };
    }

    const text = await res.text();
    checks.push({ name: "robots.txt accessible", pass: true, note: `HTTP 200 (${text.length} bytes)` });
    score += 5;

    // Crawler checks
    const crawlers = [
      "OAI-SearchBot",
      "Claude-SearchBot",
      "PerplexityBot",
      "Googlebot",
      "Google-Extended",
    ];

    let foundCrawlers = 0;
    for (const bot of crawlers) {
      const regex = new RegExp(`User-agent:\\s*${bot}`, "i");
      if (regex.test(text)) {
        foundCrawlers++;
      }
    }

    if (foundCrawlers >= 3) {
      checks.push({ name: "AI search crawlers declared", pass: true, note: `${foundCrawlers}/5 verified bots declared` });
      score += 10;
    } else if (foundCrawlers > 0) {
      checks.push({ name: "AI search crawlers declared", pass: true, note: `${foundCrawlers}/5 verified bots declared (expand coverage)` });
      score += 5;
    } else {
      checks.push({ name: "AI search crawlers declared", pass: false, note: "No explicit AI search crawler rules found" });
    }

    // Sitemap check
    if (/Sitemap:\s*https?:\/\//i.test(text)) {
      checks.push({ name: "Sitemap declared in robots.txt", pass: true, note: "Valid Sitemap URL directive" });
      score += 5;
    } else {
      checks.push({ name: "Sitemap declared in robots.txt", pass: false, note: "Missing Sitemap directive" });
    }

    // Blanket Disallow check
    if (/User-agent:\s*\*\s*\n\s*Disallow:\s*\/\s*$/im.test(text)) {
      checks.push({ name: "Disallow boundaries", pass: false, note: "Blanket Disallow: / blocks AI engines" });
    } else {
      checks.push({ name: "Disallow boundaries", pass: true, note: "No blanket Disallow: / blocking bots" });
      score += 5;
    }

  } catch (err) {
    checks.push({ name: "robots.txt accessibility", pass: false, note: err.message });
  }

  return { score, max: 25, checks };
}

async function inspectLlms(domain) {
  const url = `https://${domain}/llms.txt`;
  const checks = [];
  let score = 0;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      checks.push({ name: "llms.txt presence", pass: false, note: `HTTP ${res.status} (Missing endpoint)` });
      return { score: 0, max: 25, checks };
    }

    const contentType = res.headers.get("content-type") || "";
    const isTextMime = contentType.includes("text/plain") || contentType.includes("text/markdown");
    if (isTextMime) {
      checks.push({ name: "llms.txt MIME type", pass: true, note: contentType.split(";")[0] });
      score += 5;
    } else {
      checks.push({ name: "llms.txt MIME type", pass: false, note: `Non-standard MIME (${contentType})` });
    }

    const text = await res.text();
    checks.push({ name: "llms.txt accessible", pass: true, note: `HTTP 200 (${text.length} bytes)` });
    score += 5;

    // Check H1
    if (/^#\s+.+/m.test(text)) {
      checks.push({ name: "H1 Project Title", pass: true, note: "Valid top-level markdown heading" });
      score += 5;
    } else {
      checks.push({ name: "H1 Project Title", pass: false, note: "Missing # Title heading" });
    }

    // Check Blockquote summary
    if (/^>\s+.+/m.test(text)) {
      checks.push({ name: "Entity summary blockquote", pass: true, note: "Found canonical blockquote summary" });
      score += 5;
    } else {
      checks.push({ name: "Entity summary blockquote", pass: false, note: "Missing > blockquote entity brief" });
    }

    // Check mapped links
    const linkMatches = text.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    if (linkMatches.length >= 3) {
      checks.push({ name: "Structured Markdown navigation", pass: true, note: `${linkMatches.length} canonical links mapped` });
      score += 5;
    } else {
      checks.push({ name: "Structured Markdown navigation", pass: false, note: `${linkMatches.length} links found (minimum 3 recommended)` });
    }

  } catch (err) {
    checks.push({ name: "llms.txt presence", pass: false, note: err.message });
  }

  return { score, max: 25, checks };
}

async function inspectHtmlAndSchema(domain) {
  const url = `https://${domain}/`;
  const checks = [];
  let score = 0;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      checks.push({ name: "Homepage SSR retrieval", pass: false, note: `HTTP ${res.status}` });
      return { score: 0, max: 50, checks };
    }

    const html = await res.text();
    const isSSR = html.length > 2500 && !html.includes('<div id="__next"></div></body>');
    if (isSSR) {
      checks.push({ name: "SSR HTML payload density", pass: true, note: `${Math.round(html.length / 1024)} KB initial markup` });
      score += 10;
    } else {
      checks.push({ name: "SSR HTML payload density", pass: false, note: "Low initial HTML payload (client-side render suspected)" });
    }

    // Metadata checks
    const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(html);
    const hasCanonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
    if (hasTitle && hasCanonical) {
      checks.push({ name: "Standard SEO metadata", pass: true, note: "Found <title> and rel='canonical'" });
      score += 5;
    } else {
      checks.push({ name: "Standard SEO metadata", pass: false, note: "Missing title or canonical tag" });
    }

    // Extract JSON-LD scripts
    const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        scripts.push(parsed);
      } catch {}
    }

    if (scripts.length === 0) {
      checks.push({ name: "JSON-LD structured data", pass: false, note: "No <script type='application/ld+json'> found" });
      return { score, max: 50, checks };
    }

    checks.push({ name: "JSON-LD structured data detected", pass: true, note: `${scripts.length} script block(s) parsed` });
    score += 5;

    // Flatten @graph
    const nodes = [];
    for (const s of scripts) {
      if (Array.isArray(s["@graph"])) {
        nodes.push(...s["@graph"]);
      } else {
        nodes.push(s);
      }
    }

    // 1. Identity & Resolution (Legal name, url, logo, sameAs)
    const hasOrg = nodes.some(n => ["Organization", "LocalBusiness", "Corporation"].includes(n["@type"]));
    const hasSameAs = nodes.some(n => Array.isArray(n.sameAs) && n.sameAs.length > 0);
    if (hasOrg && hasSameAs) {
      checks.push({ name: "Schema: Entity Identity & Corroboration", pass: true, note: "Organization node with sameAs external corroboration" });
      score += 8;
    } else if (hasOrg) {
      checks.push({ name: "Schema: Entity Identity & Corroboration", pass: true, note: "Organization node found (sameAs missing)" });
      score += 4;
    } else {
      checks.push({ name: "Schema: Entity Identity & Corroboration", pass: false, note: "Missing root Organization node" });
    }

    // 2. Ontological Categorization (knowsAbout / disambiguatingDescription)
    const hasOntology = nodes.some(n => n.knowsAbout || n.disambiguatingDescription);
    if (hasOntology) {
      checks.push({ name: "Schema: Ontological Disambiguation", pass: true, note: "Declared knowsAbout and/or disambiguatingDescription" });
      score += 8;
    } else {
      checks.push({ name: "Schema: Ontological Disambiguation", pass: false, note: "Missing knowsAbout topic authority or disambiguation" });
    }

    // 3. Geographic Precision (PostalAddress / areaServed)
    const hasAddress = nodes.some(n => n.address || n.areaServed || n.geo);
    if (hasAddress) {
      checks.push({ name: "Schema: Geographic Precision", pass: true, note: "PostalAddress or areaServed declared" });
      score += 7;
    } else {
      checks.push({ name: "Schema: Geographic Precision", pass: false, note: "No geographic PostalAddress or areaServed" });
    }

    // 4. E-E-A-T Anchoring (contactPoint, foundingDate, author)
    const hasEeat = nodes.some(n => n.contactPoint || n.foundingDate || n.author || n.founder);
    if (hasEeat) {
      checks.push({ name: "Schema: E-E-A-T Anchoring", pass: true, note: "ContactPoint or founding date verified" });
      score += 7;
    } else {
      checks.push({ name: "Schema: E-E-A-T Anchoring", pass: false, note: "No ContactPoint or founding credentials" });
    }

  } catch (err) {
    checks.push({ name: "Homepage retrieval", pass: false, note: err.message });
  }

  return { score, max: 50, checks };
}

async function run() {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    exit(0);
  }

  const isJson = args.includes("--json");
  const thresholdIdx = args.indexOf("--threshold");
  const threshold = thresholdIdx !== -1 && args[thresholdIdx + 1] ? parseInt(args[thresholdIdx + 1], 10) : 0;

  const targetInput = args.find(a => !a.startsWith("-"));
  if (!targetInput) {
    console.error(`${c.red}Error:${c.reset} Please provide a target domain or URL.`);
    exit(1);
  }

  const domain = cleanDomain(targetInput);

  if (!isJson) {
    console.log(`\n${c.bold}Cernitur AEO Linter${c.reset} &bull; Diagnostic Engine`);
    console.log(`${c.dim}Inspecting target: https://${domain}${c.reset}\n`);
  }

  const [robotsResult, llmsResult, htmlResult] = await Promise.all([
    inspectRobots(domain),
    inspectLlms(domain),
    inspectHtmlAndSchema(domain),
  ]);

  const totalScore = robotsResult.score + llmsResult.score + htmlResult.score;
  const totalMax = 100;

  if (isJson) {
    const output = {
      domain,
      timestamp: new Date().toISOString(),
      score: totalScore,
      max: totalMax,
      grade: totalScore >= 85 ? "A" : totalScore >= 70 ? "B" : totalScore >= 50 ? "C" : "D",
      pillars: {
        robots: robotsResult,
        llms: llmsResult,
        schema: htmlResult,
      },
      reportUrl: `https://cernitur.com/report/${encodeURIComponent(domain)}`,
    };
    console.log(JSON.stringify(output, null, 2));
    if (totalScore < threshold) {
      exit(1);
    }
    exit(0);
  }

  // Terminal UI Printing
  console.log(`─────────────────────────────────────────────────────────────────`);
  console.log(`${c.bold}1. AI Search Crawlers & Robots.txt${c.reset}  (${robotsResult.score}/${robotsResult.max} pts)`);
  for (const check of robotsResult.checks) {
    const symbol = check.pass ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    console.log(`  ${symbol} ${check.name.padEnd(36)} ${c.dim}${check.note}${c.reset}`);
  }

  console.log(`\n${c.bold}2. Machine-Readable Endpoint (/llms.txt)${c.reset}  (${llmsResult.score}/${llmsResult.max} pts)`);
  for (const check of llmsResult.checks) {
    const symbol = check.pass ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    console.log(`  ${symbol} ${check.name.padEnd(36)} ${c.dim}${check.note}${c.reset}`);
  }

  console.log(`\n${c.bold}3. SSR Payload Density & Schema.org Graph${c.reset}  (${htmlResult.score}/${htmlResult.max} pts)`);
  for (const check of htmlResult.checks) {
    const symbol = check.pass ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    console.log(`  ${symbol} ${check.name.padEnd(36)} ${c.dim}${check.note}${c.reset}`);
  }

  console.log(`─────────────────────────────────────────────────────────────────`);

  let badge = `${c.bgGreen} EXCELLENT ${c.reset}`;
  if (totalScore < 50) badge = `${c.bgRed} CRITICAL INVISIBILITY ${c.reset}`;
  else if (totalScore < 75) badge = `${c.bgAmber} PARTIAL VISIBILITY ${c.reset}`;

  console.log(`\n${c.bold}TOTAL AEO READINESS SCORE:${c.reset}  ${c.bold}${totalScore}/100${c.reset}  ${badge}`);
  console.log(`${c.cyan}Full Diagnostic Report:${c.reset} https://cernitur.com/report/${encodeURIComponent(domain)}`);
  console.log(`${c.dim}Fix your schema & crawler infrastructure: https://cernitur.com/pricing${c.reset}\n`);

  if (totalScore < threshold) {
    console.error(`${c.red}Build failed:${c.reset} Score (${totalScore}) is below threshold (${threshold}).`);
    exit(1);
  }
}

run().catch(err => {
  console.error("Diagnostic failure:", err);
  exit(1);
});
