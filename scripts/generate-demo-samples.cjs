// Generates public, synthetic examples with the same templates as the beta app.
// No authenticated endpoint, real workspace, or cloud credential is used.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const app = process.env.WURFKIT_APP_ROOT || path.resolve(root, '../.worktrees/app-security');
const appRequire = createRequire(path.join(app, 'package.json'));
const ts = appRequire('typescript');
// Compile only trusted local project sources for this build-time generator.
require.extensions['.ts'] = function (module, filename) {
  if (!filename.startsWith(app + path.sep)) throw new Error('Unexpected TypeScript source');
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const contract = require(path.join(app, 'lib/documents/kaufvertrag.ts'));
const litterTemplate = require(path.join(app, 'lib/documents/wurfmeldung.ts'));
const handover = require(path.join(app, 'lib/documents/welpenmappe.ts'));
const { renderHtmlPdf } = require(path.join(app, 'lib/pdf/render-html-pdf.ts'));
const demo = vm.runInNewContext(fs.readFileSync(path.join(root, 'demo/data.js'), 'utf8') + '\n({BREEDER,DOGS,LITTERS,PUPPIES})');
const output = path.join(root, 'samples');
fs.mkdirSync(output, { recursive: true });
const generatedAt = '2026-09-11T12:00:00.000Z';
const breeder = { fullName: demo.BREEDER.fullName, kennelName: demo.BREEDER.kennelName + ' (Demo)' };
const manifest = {};
const jobs = [];
for (const source of demo.LITTERS) {
  const puppies = demo.PUPPIES.filter(puppy => puppy.litterId === source.id);
  const litter = { id: source.id, name: source.name, breed: source.breed, whelpDate: source.birthDate, sire: source.externalSire?.name || demo.DOGS.find(dog => dog.id === source.sireId)?.fullName || 'nicht hinterlegt', dam: demo.DOGS.find(dog => dog.id === source.damId)?.fullName || 'nicht hinterlegt', club: demo.BREEDER.zuchtverein };
  const snapshot = { schemaVersion: 1, documentType: 'wurfmeldung_zusammenstellung', templateVersion: litterTemplate.WURFMELDUNG_TEMPLATE_VERSION, generatedAt, breeder, litter: { ...litter, puppies: puppies.map(puppy => ({ id: puppy.id, name: puppy.name, sex: puppy.sex === 'male' ? 'Rüde' : 'Hündin', status: puppy.status, microchip: puppy.microchip })) } };
  jobs.push({ key: 'wurfmeldung:' + source.id, name: 'wurfmeldung-' + source.id, html: litterTemplate.renderWurfmeldungHtml(snapshot), version: snapshot.templateVersion });
  for (const sourcePuppy of puppies) {
    // Match the app's buyer-specific document rule; never invent a buyer.
    if (!sourcePuppy.buyer) continue;
    const puppy = { id: sourcePuppy.id, name: sourcePuppy.name, sex: sourcePuppy.sex === 'male' ? 'Rüde' : 'Hündin', microchip: sourcePuppy.microchip };
    const buyer = { id: 'demo-buyer-' + puppy.id, fullName: sourcePuppy.buyer.name, address: sourcePuppy.buyer.address, email: sourcePuppy.buyer.email, legalBasis: 'contract' };
    const contractSnapshot = { schemaVersion: 1, documentType: 'kaufvertrag', templateVersion: contract.KAUFVERTRAG_TEMPLATE_VERSION, generatedAt, seller: breeder, buyer, puppy, litter };
    const handoverSnapshot = { schemaVersion: 1, documentType: 'welpenmappe_uebergabe', templateVersion: handover.WELPENMAPPE_TEMPLATE_VERSION, generatedAt, breeder, buyer, puppy, litter, handover: { completed: ['Käuferprofil zugeordnet', 'Chipnummer zum Abgleich hinterlegt'], missing: ['Originalunterlagen vor Übergabe prüfen und Anlagen dokumentieren'], attachments: [] } };
    jobs.push({ key: 'kaufvertrag:' + puppy.id, name: 'kaufvertrag-' + puppy.id, html: contract.renderKaufvertragHtml(contractSnapshot), version: contractSnapshot.templateVersion });
    jobs.push({ key: 'welpenpaket:' + puppy.id, name: 'welpenpaket-' + puppy.id, html: handover.renderWelpenmappeHtml(handoverSnapshot), version: handoverSnapshot.templateVersion });
  }
}
(async () => {
  const { getDocument } = await import(pathToFileURL(appRequire.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
  const { createCanvas } = appRequire('@napi-rs/canvas');
  for (const job of jobs) {
    const bytes = await renderHtmlPdf(job.html);
    fs.writeFileSync(path.join(output, job.name + '.pdf'), bytes);
    const pdf = await getDocument({ data: bytes.slice() }).promise;
    const previews = [];
    let textCount = 0;
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      textCount += (await page.getTextContent()).items.length;
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const filename = job.name + '-' + index + '.png';
      fs.writeFileSync(path.join(output, filename), canvas.toBuffer('image/png'));
      previews.push('samples/' + filename);
    }
    if (textCount < 10) throw new Error(job.name + ': missing searchable text');
    manifest[job.key] = { pdf: 'samples/' + job.name + '.pdf', previews, pages: pdf.numPages, templateVersion: job.version };
    console.log(job.name + ': ' + pdf.numPages + ' page(s), ' + textCount + ' text items');
    await pdf.destroy();
  }
  fs.writeFileSync(path.join(output, 'manifest.js'), 'window.WK_PDF_SAMPLES = ' + JSON.stringify(manifest, null, 2) + ';\n');
  fs.writeFileSync(path.join(output, 'README.md'), '# Public demo PDF samples\n\nSynthetic data from demo/data.js. Generated with the beta app document templates using scripts/generate-demo-samples.cjs. Rebuild after template or demo-data changes. No real customer data is used. Manifest includes template versions and actual page counts.\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
