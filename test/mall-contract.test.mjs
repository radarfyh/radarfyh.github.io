import assert from 'node:assert/strict';
import test from 'node:test';
import { addProduct, checkoutLink, publicProducts, safeMallEndpoint } from '../portal-assets/mall-contract.mjs';
const crm = { sku: 'CRM_GOLD_ANNUAL', product: 'CRM', subjectType: 'TENANT', title: '金牌', priceFen: 599900, days: 0, periodRule: 'ANNIVERSARY', onSale: true };
const football = { ...crm, sku: 'FOOTBALL:monthly', product: 'FOOTBALL', subjectType: 'USER', days: 30, periodRule: 'DAYS' };
test('public reads reject credentialled URLs, other domains and malformed prices', () => {
  assert.equal(safeMallEndpoint(undefined, 'www.hunting-info.ltd'), 'https://all.hunting-info.ltd/crm/crm-commerce/mall/catalog');
  for (const bad of ['https://other.example/catalog', 'https://user:secret@all.hunting-info.ltd/crm/crm-commerce/mall/catalog', 'https://all.hunting-info.ltd/crm/crm-commerce/mall/catalog?token=x']) assert.throws(() => safeMallEndpoint(bad, 'www.hunting-info.ltd'));
  assert.throws(() => publicProducts({ code: 0, data: [{ ...crm, priceFen: 0.1 }] }));
  assert.throws(() => publicProducts({ code: 0, data: [{ ...crm, subjectType: 'USER' }] }));
  assert.deepEqual(publicProducts({ code: 0, data: [{ ...crm, onSale: false }] }), []);
});
test('mixed cart hands off only SKUs and replaces a plan within the same product', () => {
  const selected = addProduct(addProduct([], crm), football);
  const link = new URL(checkoutLink(selected));
  assert.deepEqual([...link.searchParams.keys()], ['items']);
  assert.equal(link.searchParams.get('items'), 'CRM_GOLD_ANNUAL,FOOTBALL:monthly');
  assert.equal(addProduct(selected, { ...crm, sku: 'CRM_SILVER_ANNUAL' }).length, 2);
  assert.throws(() => checkoutLink([]));
});

test('test checkout stays in the test environment and carries only SKU choices', () => {
 const link = new URL(checkoutLink([crm], 'http://192.168.106.4:31666/shop', '192.168.106.4'));
 assert.equal(link.origin, 'http://192.168.106.4:31666');
 assert.deepEqual([...link.searchParams.keys()], ['items']);
 assert.throws(() => checkoutLink([crm], 'http://192.168.106.4:31666/shop', 'www.hunting-info.ltd'));
 assert.throws(() => checkoutLink([crm], 'https://untrusted.invalid/shop', '192.168.106.4'));
});

test('test pages fail closed instead of falling back to production', () => {
 for (const host of ['localhost', '127.0.0.1', '192.168.106.4']) {
  assert.throws(() => safeMallEndpoint(undefined, host));
  assert.throws(() => checkoutLink([crm], undefined, host));
  assert.throws(() => checkoutLink([crm], 'https://all.hunting-info.ltd/crm/shop', host));
 }
});
