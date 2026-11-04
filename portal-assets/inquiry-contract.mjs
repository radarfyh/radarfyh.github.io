export function safeInquiryEndpoint(configured, pageHost) {
  const url = new URL(configured || 'https://all.hunting-info.ltd/crm/crm-public/v1/website-inquiries');
  const production = url.origin === 'https://all.hunting-info.ltd' && url.pathname === '/crm/crm-public/v1/website-inquiries';
  const localHosts = ['localhost','127.0.0.1','192.168.106.4'];
  const local = localHosts.includes(pageHost) && localHosts.includes(url.hostname)
    && ['http:','https:'].includes(url.protocol)
    && ['/crm-public/v1/website-inquiries','/crm/crm-public/v1/website-inquiries'].includes(url.pathname);
  if ((!production && !local) || url.search || url.hash || url.username || url.password) throw new Error('咨询入口配置未通过核对。');
  return url.href.replace(/\/$/, '');
}

export function validInquiryReceipt(value) {
  return value !== null && typeof value === 'object' && typeof value.submissionId === 'string'
    && /^[a-f0-9-]{8}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{12}$/i.test(value.submissionId)
    && ['PENDING','CREATED','LINKED','REJECTED'].includes(value.status);
}
