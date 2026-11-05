import test from 'node:test';
import assert from 'node:assert/strict';
import {safeInquiryEndpoint,validInquiryReceipt} from '../portal-assets/inquiry-contract.mjs';

test('public contact details can only leave for the reviewed endpoint',()=>{
  assert.equal(safeInquiryEndpoint(undefined,'www.hunting-info.ltd'),'https://all.hunting-info.ltd/crm/crm-public/v1/website-inquiries');
  for(const url of ['https://evil.invalid/crm/crm-public/v1/website-inquiries','http://all.hunting-info.ltd/crm/crm-public/v1/website-inquiries','https://all.hunting-info.ltd/admin','https://secret@all.hunting-info.ltd/crm/crm-public/v1/website-inquiries','https://all.hunting-info.ltd/crm/crm-public/v1/website-inquiries?tenant=foreign']) assert.throws(()=>safeInquiryEndpoint(url,'www.hunting-info.ltd'));
  assert.throws(()=>safeInquiryEndpoint(undefined,'192.168.106.4'));
  assert.throws(()=>safeInquiryEndpoint('https://all.hunting-info.ltd/crm/crm-public/v1/website-inquiries','localhost'));
  assert.throws(()=>safeInquiryEndpoint('http://127.0.0.1:18082/crm-public/v1/website-inquiries','www.hunting-info.ltd'));
  assert.equal(safeInquiryEndpoint('http://192.168.106.4:31666/crm-public/v1/website-inquiries','localhost'),'http://192.168.106.4:31666/crm-public/v1/website-inquiries');
});
test('HTTP success alone never establishes receipt',()=>{
  for(const value of [null,{}, {code:0,message:'success'}, {submissionId:'internal-id',status:'PENDING'}, {submissionId:'d08605cb-c5d8-4d67-bca3-c71f1345594a',status:'PAID'}]) assert.equal(validInquiryReceipt(value),false);
  assert.equal(validInquiryReceipt({submissionId:'d08605cb-c5d8-4d67-bca3-c71f1345594a',status:'PENDING',duplicate:false}),true);
});


test('intranet HTTP request IDs use cryptographic randomness without randomUUID', async () => {
 const {inquiryRequestId} = await import('../portal-assets/inquiry-contract.mjs');
 const api = {getRandomValues(bytes) { bytes.fill(7); return bytes; }};
 assert.match(inquiryRequestId(api), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.throws(() => inquiryRequestId({}), /安全随机数/);
});
