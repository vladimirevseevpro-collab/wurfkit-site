import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script } from "node:vm";
const i = readFileSync(resolve("index.html"), "utf8"),
  d = readFileSync(resolve("demo.html"), "utf8"),
  f = [];
const yes = (s, t, n) => {
    if (!s.includes(t)) f.push(`missing: ${n}`);
  },
  no = (s, t, n) => {
    if (s.includes(t)) f.push(`forbidden: ${n}`);
  };
[
  "fonts/fonts.css",
  "WurfKitForms.init(SHEET_URL)",
  'name="waitlist"',
  'name="waitlist-cta"',
  'name="contact"',
  'value="waitlist"',
  'value="waitlist-cta"',
  'value="contact"',
  "samples/kaufvertrag-aaron.pdf",
  "samples/wurfmeldung-w1.pdf",
  "samples/welpenpaket-aaron.pdf",
  "Beschwerde",
  "complaint",
  "жалоб",
  'name="privacy-consent"',
].forEach((x) => yes(i, x, x));
if (!/setAttribute\(\s*['"]inert['"]\s*,\s*['"]['"]\s*\)/.test(i)) f.push('missing modal background inert');
if (!/e\.key\s*===\s*['"]Escape['"]/.test(i)) f.push('missing modal Escape');
for (const match of i.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  try { if (match[1].includes('application/ld+json')) JSON.parse(match[2]); else new Script(match[2]); }
  catch (error) { f.push(`invalid inline script: ${error.message}`); }
}
yes(
  d,
  "Funktionen für echte Konten werden erst nach sicherer Invite-Freigabe aktiviert",
  "demo invite disclosure",
);
yes(
  d,
  "nicht einreichbar, unterschriftsreif oder rechtlich geprüft",
  "demo legal disclosure",
);
[
  "fonts/fonts.css",
  "samples/kaufvertrag-aaron-1.png",
  "samples/wurfmeldung-w1-1.png",
  "samples/welpenpaket-aaron-1.png",
].forEach((x) => {
  if (!existsSync(resolve(x))) f.push(`missing asset: ${x}`);
});
[
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "Live-Demo verfügbar · Jetzt ausprobieren",
  "Persönlicher Bereich · DSGVO-konform",
  "geplant ab 9,99 €/Monat",
  "Founder-Angebot",
].forEach((x) => no(i, x, x));
if (f.length) {
  console.error(
    "Landing release audit failed:\n" + f.map((x) => "- " + x).join("\n"),
  );
  process.exit(1);
}
console.log(
  "Landing release audit passed: local assets, forms, samples and beta claims are aligned.",
);
