'use strict';
const navigation = document.querySelector('#navigation');
const toggle = document.querySelector('.nav-toggle');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('open', open);
});
navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    toggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('open');
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    navigation.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
});

// Carry campaign attribution into the product without cookies or personal-data tracking.
const source = new URLSearchParams(location.search);
document.querySelectorAll('[data-product-link]').forEach((link) => {
  const target = new URL(link.href);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = source.get(key);
    if (value && /^[\w\u4e00-\u9fff .-]{1,80}$/u.test(value)) target.searchParams.set(key, value);
  }
  if (!target.searchParams.has('utm_source')) target.searchParams.set('utm_source', 'hunting-info-website');
  link.href = target.href;
});

document.querySelector('#inquiry-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const product = String(values.get('product') || '产品咨询');
  const company = String(values.get('company') || '').trim();
  const message = String(values.get('message') || '').trim();
  if (!message) {
    document.querySelector('#inquiry-status').textContent = '请简要填写你的需求，再生成咨询邮件。';
    return;
  }
  const body = `咨询产品：${product}\r\n称呼 / 企业：${company || '未填写'}\r\n\r\n${message}\r\n\r\n来源：https://www.hunting-info.ltd/`;
  location.href = `mailto:feng.yonghua@foxmail.com?subject=${encodeURIComponent(`[官网咨询] ${product}`)}&body=${encodeURIComponent(body)}`;
  document.querySelector('#inquiry-status').textContent = '请在邮件应用中确认收件人和内容后发送。如邮件应用未打开，可直接邮件联系 feng.yonghua@foxmail.com。';
});

// The real CRM form remains hidden until its public URL and expiry are supplied.
// Opening it never sends the mail draft or submits a lead automatically.
try {
  const config = window.HUNTING_PORTAL_CONFIG || {};
  const expiresAt = Date.parse(config.crmInquiryExpiresAt);
  const target = new URL(config.crmInquiryUrl);
  if (target.origin === 'https://all.hunting-info.ltd'
    && target.pathname === '/crm/inbound/submit' && !target.search && !target.username && !target.password
    && /^#[A-Za-z0-9._~-]{16,2048}$/.test(target.hash)
    && Number.isFinite(expiresAt) && expiresAt > Date.now()) {
    document.querySelector('#crm-inquiry-link').href = target.href;
    const date = new Date(expiresAt).toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai'});
    document.querySelector('#crm-inquiry-note').textContent = `进入正式咨询表单，由你填写并确认提交后形成企业留资。此入口有效至 ${date}，到期后可通过邮件或电话联系。`;
    document.querySelector('#crm-inquiry-entry').hidden = false;
  }
} catch {
  // Missing, expired or unrecognized public configuration keeps email available.
}

document.querySelector('#share-site').addEventListener('click', async () => {
  const status = document.querySelector('#share-status');
  const url = 'https://www.hunting-info.ltd/?utm_source=share&utm_medium=website';
  try {
    if (navigator.share) {
      await navigator.share({title: 'HUNTING-INFO · Feng 球探与风云 CRM', text: '选择你的产品，从洞察走向行动。', url});
      status.textContent = '已打开系统分享。';
    } else if (navigator.clipboard && location.protocol === 'https:') {
      await navigator.clipboard.writeText(url);
      status.textContent = '官网链接已复制。';
    } else {
      status.textContent = '请复制浏览器地址栏中的官网链接进行分享。';
    }
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? '已取消分享。' : '请复制浏览器地址栏中的官网链接进行分享。';
  }
});
