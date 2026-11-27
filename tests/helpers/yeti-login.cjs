const fs = require('node:fs');
const path = require('node:path');
const authSource = fs.readFileSync(path.resolve(__dirname, '../../js/yeti-auth.js'), 'utf8');
function configuredValue(pattern, label) {
 const match = authSource.match(pattern);
 if (!match) throw new Error('Could not read configured ' + label + ' for browser login test.');
 return match[1];
}
async function loginToYeti(page, role = 'user') {
 const credentials = role === 'admin'
  ? { id: '1297', password: configuredValue(/adminPassword:\s*'([^']+)'/, 'Admin password') }
  : { id: configuredValue(/userId:\s*'([^']+)'/, 'User ID'), password: configuredValue(/userPassword:\s*'([^']+)'/, 'User password') };
 await page.locator('[data-yeti-auth-role="' + role + '"]').click();
 await page.locator('#yetiAuthUserId').fill(credentials.id);
 await page.locator('#yetiAuthPassword').fill(credentials.password);
 await page.locator('#yetiAuthForm button[type="submit"]').click();
 await page.waitForFunction(() => document.body.classList.contains('yeti-authenticated'), { timeout: 5000 });
 const actualRole = await page.locator('body').getAttribute('data-yeti-auth-role');
 if (actualRole !== role) throw new Error('YETI ' + role + ' login did not establish the expected role.');
}
module.exports = { loginToYeti };
