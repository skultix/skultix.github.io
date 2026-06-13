// Reads config.json and writes a deploy-ready site to _site/.
// Bakes the terminal markup, meta tags, and computed --key-width directly
// into index.html so the published page is fully static — no runtime fetch.

import { mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";

const cfg = JSON.parse(await readFile("config.json", "utf8"));

const handle = (cfg.prompt || "").split("@")[1] || cfg.prompt || "";
const fullTitle = handle ? `${cfg.title} (${handle})` : cfg.title;
const fullDesc = cfg.bio.endsWith(".") ? cfg.bio : `${cfg.bio}.`;

const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESCAPE[c]);

const prompt =
    `<span class="prompt-host">${esc(cfg.prompt)}</span>` +
    `<span class="prompt-tail">:~$ </span>`;

const iconHTML = (icon) =>
    icon ? `<i class="nf ${esc(icon)}" aria-hidden="true"></i>` : "";

const linkHTML = (link) =>
    `<div class="line out">` +
        `<span class="key">${esc(link.key)}</span>` +
        `<a href="${esc(link.url)}" rel="me">${iconHTML(link.icon)}${esc(link.label)}</a>` +
    `</div>`;

const maxKeyLen = Math.max(0, ...cfg.links.map(l => (l.key || "").length));
const keyWidth = `${maxKeyLen + 2}ch`;

const terminalHTML = [
    `<div class="line">${prompt}<span class="cmd">whoami</span></div>`,
    `<div class="line out"><span class="name">${esc(cfg.title)}</span></div>`,
    `<div class="line out tag">${esc(cfg.bio)}</div>`,
    `<div class="blank"></div>`,
    `<div class="line">${prompt}<span class="cmd">links</span></div>`,
    ...cfg.links.map(linkHTML),
    `<div class="blank"></div>`,
    `<div class="line">${prompt}<span class="cursor" aria-hidden="true">▊</span></div>`,
].join("");

const patches = [
    [/<title>[^<]*<\/title>/, `<title>${esc(fullTitle)}</title>`],
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(fullDesc)}">`],
    [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(fullTitle)}">`],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(fullDesc)}">`],
    [/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(fullTitle)}">`],
    [/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(fullDesc)}">`],
    [/--key-width: [^;]+;/, `--key-width: ${keyWidth};`],
    [/<section id="terminal"[^>]*>[\s\S]*?<\/section>/, `<section id="terminal">${terminalHTML}</section>`],
];

let html = await readFile("index.html", "utf8");
for (const [re, replacement] of patches) {
    if (!re.test(html)) throw new Error(`patch pattern not found in index.html: ${re}`);
    html = html.replace(re, replacement);
}

await rm("_site", { recursive: true, force: true });
await mkdir("_site", { recursive: true });
await writeFile("_site/index.html", html);

for (const f of ["CNAME", ".nojekyll", "pfp.png"]) {
    try { await copyFile(f, `_site/${f}`); } catch { /* optional */ }
}

console.log(`built: title="${fullTitle}" links=${cfg.links.length} key-width=${keyWidth}`);
