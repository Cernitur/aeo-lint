# @cernitur/aeo-lint

> **Deterministic Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) diagnostic CLI.**  
> Built and maintained by [Cernitur Technologies LLC](https://cernitur.com).

Inspects any target domain in seconds to verify whether modern AI search engines—such as **Google AI Overviews, OpenAI Search (ChatGPT), Anthropic Claude, Perplexity, and Apple Intelligence**—can accurately crawl, parse, and cite your website without hallucination or omission.

---

## ⚡ Quickstart (Zero Dependencies)

Run directly via `npx` without installation:

```bash
npx @cernitur/aeo-lint https://yourdomain.com
```

Or install globally:

```bash
npm install -g @cernitur/aeo-lint
aeo-lint yourdomain.com
```

---

## 🔍 What It Inspects (100-Point Rubric)

`aeo-lint` checks the 3 foundational pillars of modern AI search engine accessibility:

### 1. AI Search Crawlers in `robots.txt` (25 pts)
- Explicit permissions for verified retrieval bots: `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Googlebot`, and `Google-Extended`.
- Presence of a valid `Sitemap: https://yourdomain.com/sitemap.xml` directive.
- Detection of blanket `Disallow: /` directives that inadvertently block conversational AI indexing.

### 2. Machine-Readable Endpoint (`/llms.txt`) (25 pts)
- Valid HTTP 200 response with `Content-Type: text/plain` or `text/markdown`.
- Compliance with the official [llms.txt specification](https://llmstxt.org).
- Top-level `# Title` heading and canonical `> Blockquote` entity summary.
- Clean structured Markdown navigation links for RAG chunk ingestion.

### 3. SSR Payload Density & Schema.org `@graph` (50 pts)
- **Zero Client-Render Traps:** Confirms initial HTML contains high-density content for non-JavaScript headless crawlers.
- **Identity & External Corroboration:** Validates `Organization` node with `sameAs` links (Wikidata, LinkedIn, GitHub, Crunchbase).
- **Ontological Disambiguation:** Checks `disambiguatingDescription` and `knowsAbout` topical authority arrays.
- **Geographic Precision:** Verifies `PostalAddress` and `areaServed` declarations.
- **E-E-A-T Anchoring:** Verifies `contactPoint`, legal registration, and founding credentials.

---

## 🛠️ Command-Line Options

```bash
npx @cernitur/aeo-lint <target-domain-or-url> [options]

Options:
  --json             Output diagnostic results in raw machine-readable JSON
  --threshold <num>  Exit with code 1 if total score is below this threshold (Default: 0)
  --help, -h         Show help and manual
```

### CI/CD Integration (GitHub Actions)

Fail your build if your pull request introduces AI crawlability regressions:

```yaml
name: AEO Compliance Check
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Run Cernitur AEO Linter
        run: npx @cernitur/aeo-lint https://staging.yourdomain.com --threshold 80
```

---

## 🌐 Official Resources & Enterprise Infrastructure

- **Hosted Web Scanner:** [https://cernitur.com/scanner](https://cernitur.com/scanner)
- **One-Time AEO Architecture Suite:** [https://cernitur.com/pricing](https://cernitur.com/pricing)
- **JSON-LD Entity Graph Guide:** [https://cernitur.com/guides/json-ld-entity-graph](https://cernitur.com/guides/json-ld-entity-graph)
- **AI Crawlers Specification Guide:** [https://cernitur.com/guides/ai-crawlers-robots-txt](https://cernitur.com/guides/ai-crawlers-robots-txt)

---

## 📄 License

Apache-2.0 &copy; 2026 [Cernitur Technologies LLC](https://cernitur.com) (Sheridan, WY).
