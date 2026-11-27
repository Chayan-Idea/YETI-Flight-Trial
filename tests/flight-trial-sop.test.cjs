const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');
const editor=read('js/flight-trial-sop-editor.js');
const auth=read('js/yeti-auth.js');
const sw=read('service-worker.js');
const workflow=read('.github/workflows/publish-sop.yml');
const manifest=JSON.parse(read('data/flight-trial-sop.json'));
const status=JSON.parse(read('data/sop-publication-status.json'));

assert.ok([1,2].includes(manifest.schemaVersion),'Central SOP manifest must support legacy HTML or published PDF schema');
if(manifest.schemaVersion===2){assert.ok(manifest.pdfUrl&&manifest.revision&&manifest.sourceSha256,'Published PDF manifest must include revision, URL and source checksum');}
if(manifest.schemaVersion===1){assert.ok(manifest.html.includes('flight-trial-reading-document'),'Legacy SOP reading document must remain available as first-publication fallback');}
assert.equal(status.schemaVersion,1,'Publication status schema remains supported');

assert.match(html,/id="flightTrialSopAdminTools"/,'Admin SOP mode controls must exist');
assert.match(html,/id="flightTrialSopReadModeBtn"/,'Read View Mode control must exist');
assert.match(html,/id="flightTrialSopEditModeBtn"/,'Edit View Mode control must exist');
assert.match(html,/id="flightTrialSopExportPdfBtn"/,'Published PDF export control must exist');
assert.match(html,/id="flightTrialSopPdfInput"/,'Admin must have a PDF reference upload control');
assert.match(html,/id="flightTrialSopProceedBtn"/,'Proceed and Update action must exist');
assert.match(html,/Proceed and Update in the Webpage/,'Proceed button label must match the approved wording');
assert.doesNotMatch(html,/flightTrialSopSaveBtn|flightTrialSopCancelBtn|flightTrialSopDownloadBtn|flightTrialSopGithubUploadBtn/,'Old direct-edit, cancel and JSON-download controls must be removed');
assert.match(html,/flight-trial-sop-editor\.js\?v=20/,'Current SOP script cache version must be loaded');
assert.match(html,/yeti-auth\.js\?v=2/,'Current authentication script cache version must be loaded');

assert.match(editor,/doc\.schemaVersion===2&&doc\.pdfUrl&&doc\.revision/,'Shared reader must load a published PDF manifest');
assert.match(editor,/new URL\(doc\.pdfUrl,BASE\)/,'PDF path must resolve relative to the GitHub Pages application');
assert.match(editor,/legacyArticle\.hidden=false/,'Legacy SOP remains visible until the first PDF is published');
assert.match(editor,/document\.body\.dataset\.yetiAuthRole/,'SOP controls must check authenticated role');
assert.match(editor,/ADMIN SESSION/,'SOP controls must also recognize the visible authenticated Admin session');
assert.match(auth,/yeti:auth-role-changed/,'Authentication must announce role changes to the SOP interface');
assert.match(editor,/document\.addEventListener\('yeti:auth-role-changed'/,'SOP controls must respond to authentication changes');
assert.match(editor,/await f\.slice\(0,5\)\.arrayBuffer\(\)/,'Browser validates the PDF file signature');
assert.match(editor,/25\*1024\*1024/,'Browser enforces the 25 MB PDF upload limit');
assert.match(editor,/packageType:'yeti-flight-trial-sop-pdf'/,'Browser generates a structured JSON publication package');
assert.match(editor,/pdfBase64:btoa\(binary\)/,'JSON package contains the PDF payload');
assert.match(editor,/link\.download='flight-trial-sop\.json'/,'Generated JSON package has the expected filename');
assert.match(editor,/window\.open\('https:\/\/github\.com\/'\+OWNER\+'\/'\+REPO\+'\/upload\/main\/pending-sop'/,'Proceed opens the authenticated GitHub upload location');
assert.match(editor,/setTimeout\(\(\)=>location\.reload\(\),1800\)/,'Page automatically refreshes after confirmed publication');
assert.match(editor,/flight-trial-sop\.json/,'Admin is told to upload the generated JSON package to GitHub');
assert.match(editor,/setTimeout\(poll,5000\)/,'Publication status is checked every five seconds');
assert.match(editor,/15\*60\*1000/,'Polling stops with a timeout rather than waiting indefinitely');
assert.match(editor,/state==='failed'/,'Failed publication preserves the current published document');
assert.match(editor,/state==='published'/,'Published status is verified before switching the reader');
assert.match(editor,/PDFJS_MODULE/,'Shared PDF reading uses the pinned PDF.js module');
assert.match(editor,/pdfjs\.getDocument\(\{url/,'Published PDF is rendered from the original document in-page');
assert.match(editor,/yeti-sop-pdf-canvas/,'PDF pages are rendered to in-page canvases, not a browser PDF iframe');\nassert.doesNotMatch(editor,/createElement\\('iframe'\\)/,'SOP reader must not rely on the browser or Adobe PDF iframe viewer');
assert.match(editor,/window\.addEventListener\('focus',roleUpdate\)/,'Admin mode visibility is re-evaluated on window focus');
assert.doesNotMatch(editor,/contentEditable|Save Changes|Personal Access Token|localStorage/,'No direct HTML editor or browser-stored GitHub credential remains');

assert.match(workflow,/pending-sop\/flight-trial-sop\.json/,'GitHub workflow is triggered by the generated JSON package path');
assert.match(workflow,/pdfBase64/,'Workflow extracts the PDF payload from the JSON package');
assert.match(workflow,/qpdf --check/,'Workflow performs structural PDF validation');
assert.match(workflow,/pdfinfo pending-sop\/flight-trial-sop\.pdf/,'Workflow inspects the PDF document and page count');
assert.match(workflow,/pageCount:Number\(pageMatch\[1\]\)/,'Published manifest records PDF page count');
assert.match(workflow,/sha256:crypto\.createHash\('sha256'\)/,'Published manifest records SHA-256');
assert.match(workflow,/documents\/sop\/revisions\//,'Each published PDF is stored as an immutable revision');
assert.match(workflow,/state:'validating'/,'Workflow exposes validation status');
assert.match(workflow,/state:'publishing'/,'Workflow exposes publishing status');
assert.match(workflow,/state:'published'/,'Workflow exposes published status');
assert.match(workflow,/state:'failed'/,'Workflow exposes failed status');
assert.match(workflow,/contents: write/,'Workflow has the repository write permission needed for publication');

assert.match(sw,/yeti-flight-trial-shell-v225/,'Service-worker shell cache is versioned for this release');
assert.match(sw,/pdfjs-dist@4\.10\.38/,'Pinned PDF.js runtime is cached for repeat and offline reader loads');
assert.match(sw,/SOP data is always network-first/,'SOP manifest and status use network-first fetching');
assert.match(sw,/pathname\.endsWith\('\.pdf'\)/,'PDF files are not served from stale shell cache');
assert.match(sw,/flight-trial-sop-editor\.js/,'SOP script remains in the application shell');
console.log('Flight Trial SOP PDF publication and shared-reader checks passed.');
