// Reads config.json and writes a deploy-ready site to _site/.
// Patches static <title> / OG / Twitter meta tags so link-preview crawlers
// (which don't run JS) see the same name + bio that the runtime renderer uses.

import { mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";

const cfg = JSON.parse(await readFile("config.json", "utf8"));

const handle = (cfg.prompt || "").split("@")[1] || cfg.prompt || "";
const fullTitle = handle ? `${cfg.title} (${handle})` : cfg.title;
const fullDesc = cfg.bio.endsWith(".") ? cfg.bio : `${cfg.bio}.`;

const escAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escText = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const patches = [
    [/<title>[^<]*<\/title>/, `<title>${escText(fullTitle)}</title>`],
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(fullDesc)}">`],
    [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(fullTitle)}">`],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(fullDesc)}">`],
    [/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escAttr(fullTitle)}">`],
    [/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escAttr(fullDesc)}">`],
];

let html = await readFile("index.html", "utf8");
for (const [re, replacement] of patches) {
    if (!re.test(html)) throw new Error(`patch pattern not found in index.html: ${re}`);
    html = html.replace(re, replacement);
}

await rm("_site", { recursive: true, force: true });
await mkdir("_site", { recursive: true });
await writeFile("_site/index.html", html);
await copyFile("config.json", "_site/config.json");

for (const f of ["CNAME", ".nojekyll", "pfp.png"]) {
    try { await copyFile(f, `_site/${f}`); } catch { /* optional */ }
}

console.log(`patched: title="${fullTitle}" description="${fullDesc}"`);
