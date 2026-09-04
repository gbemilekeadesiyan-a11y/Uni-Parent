import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const pages = ["index.html", "profile.html", "schedule.html", "sources.html", "404.html"];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("every page has unique SEO metadata and one h1", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const page of pages) {
    const html = read(page);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
    assert.ok(title, `${page} needs a title`);
    assert.ok(description, `${page} needs a description`);
    assert.match(html, /<link rel="canonical" href="https:\/\/[^\"]+"/i);
    assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${page} must have one h1`);
    assert.ok(!titles.has(title), `${page} title must be unique`);
    assert.ok(!descriptions.has(description), `${page} description must be unique`);
    titles.add(title);
    descriptions.add(description);
  }
});

test("structured data blocks contain valid JSON", () => {
  for (const page of pages.filter((name) => name !== "404.html")) {
    const html = read(page);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    assert.ok(blocks.length > 0, `${page} needs structured data`);
    for (const block of blocks) assert.doesNotThrow(() => JSON.parse(block[1]));
  }
});

test("crawl and social assets exist", () => {
  for (const file of ["sitemap.xml", "robots.txt", "llms.txt", "assets/brand-mark.png", "assets/favicon-32.png", "assets/apple-touch-icon.png", "assets/uni-parent-social.jpg"]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
  }
  assert.match(read("robots.txt"), /Sitemap: https:\/\/uni-parent\.vercel\.app\/sitemap\.xml/);
  assert.equal((read("sitemap.xml").match(/<url>/g) ?? []).length, 4);
});

test("root-relative internal page and asset links resolve", () => {
  for (const page of pages) {
    const html = read(page);
    const links = [...html.matchAll(/(?:href|src)="(\/[^"#?]+)"/g)].map((match) => match[1]);
    for (const link of links) {
      const localPath = link === "/" ? "index.html" : link.slice(1);
      assert.ok(fs.existsSync(path.join(root, localPath)), `${page} references missing ${link}`);
    }
  }
});

test("production files contain no source map references and page loader stays small", () => {
  const productionFiles = ["styles.css", ...pages, ...fs.readdirSync(path.join(root, "src"), { recursive: true }).filter((file) => file.endsWith(".js")).map((file) => `src/${file.replaceAll("\\", "/")}`)];
  for (const file of productionFiles) assert.doesNotMatch(read(file), /sourceMappingURL=/);
  assert.ok(fs.statSync(path.join(root, "src/app.js")).size < 1500, "page loader should stay below 1.5 KB");
});
