export function safeInquiryEndpoint(configured, pageHost) {
  const url = new URL(configured || 'https://all.hunting-info.ltd/crm/crm-public/v1/website-inquiries');
  const localHosts = ['localhost','127.0.0.1','192.168.106.4'];
  const production = !localHosts.includes(pageHost) && url.origin === 'https://all.hunting-info.ltd' && url.pathname === '/crm/crm-public/v1/website-inquiries';
  const local = localHosts.includes(pageHost) && localHosts.includes(url.hostname)
    && ['http:','https:'].includes(url.protocol)
    && ['/crm-public/v1/website-inquiries','/crm/crm-public/v1/website-inquiries'].includes(url.pathname);
  if ((!production && !local) || url.search || url.hash || url.username || url.password) throw new Error('咨询入口配置未通过核对。');
  return url.href.replace(/\/$/, '');
}

/** getRandomValues is also available on an intranet HTTP site; randomUUID may not be. */
export function inquiryRequestId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues !== 'function') throw new Error('浏览器未提供安全随机数');
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function validInquiryReceipt(value) {
  return value !== null && typeof value === 'object' && typeof value.submissionId === 'string'
    && /^[a-f0-9-]{8}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{12}$/i.test(value.submissionId)
    && ['PENDING','CREATED','LINKED','REJECTED'].includes(value.status);
}
