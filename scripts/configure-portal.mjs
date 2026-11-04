import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve('target/site');
const crm = new URL(process.env.PORTAL_CRM_ORIGIN || 'https://all.hunting-info.ltd/crm/');
const portal = new URL(process.env.PORTAL_PUBLIC_ORIGIN || 'https://www.hunting-info.ltd/');
const local = ['localhost', '127.0.0.1', '192.168.106.4'];
const test = local.includes(portal.hostname);
if (test && (!local.includes(crm.hostname) || crm.pathname !== '/' || !['http:', 'https:'].includes(crm.protocol))) throw new Error('Test portal requires a test CRM origin');
if (!test && (crm.href !== 'https://all.hunting-info.ltd/crm/' || portal.href !== 'https://www.hunting-info.ltd/')) throw new Error('Unreviewed public origin');
if (crm.username || crm.password || portal.username || portal.password || crm.search || crm.hash || portal.search || portal.hash) throw new Error('Origin must not contain credentials or query');
const cfg = test ? { crmMallApi: new URL('crm-commerce/mall/catalog', portal).href, crmInquiryApi: new URL('crm-public/v1/website-inquiries', portal).href, crmCheckoutUrl: new URL('shop', crm).href } : { crmMallApi: 'https://all.hunting-info.ltd/crm/crm-commerce/mall/catalog', crmInquiryApi: 'https://all.hunting-info.ltd/crm/crm-public/v1/website-inquiries', crmCheckoutUrl: 'https://all.hunting-info.ltd/crm/shop' };
async function configure(dir) {
 for (const entry of await readdir(dir, { withFileTypes: true })) {
  const file = path.join(dir, entry.name);
  if (entry.isDirectory()) await configure(file);
  else if (entry.name.endsWith('.html') && test) {
   const content = await readFile(file, 'utf8');
   await writeFile(file, content.replaceAll('https://all.hunting-info.ltd/crm/', crm.href).replaceAll('https://all.hunting-info.ltd/football/', 'http://192.168.106.4:31000/'));
  }
 }
}
await configure(output);
await writeFile(path.join(output, 'portal-assets/portal-config.js'), `window.HUNTING_PORTAL_CONFIG = Object.freeze(${JSON.stringify(cfg)});\n`);
await writeFile(path.join(output, 'release.json'), JSON.stringify({ version: process.env.FENG_RELEASE_VERSION, environment: test ? 'CRM_S3' : 'production' }));
console.log('Portal artifacts configured; no customer data or private credentials included');
