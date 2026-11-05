import { safeInquiryEndpoint, validInquiryReceipt, inquiryRequestId } from './inquiry-contract.mjs';
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

// Consultation is accepted by CRM. All pending personal fields stay only in this page's memory.
const inquiryForm = document.querySelector('#inquiry-form');
const inquiryStatus = document.querySelector('#inquiry-status');
const inquirySubmit = document.querySelector('#inquiry-submit');
const inquiryRefresh = document.querySelector('#inquiry-refresh');
let inquiryRequest;
let inquiryChallenge;
let inquiryPending;
let inquiryBusy = false;
let inquiryGeneration = 0;
function inquiryId() {
  return inquiryRequestId();
}
function inquiryEndpoint() {
  const config = window.HUNTING_PORTAL_CONFIG || {};
  return safeInquiryEndpoint(config.crmInquiryApi, location.hostname);
}
async function inquiryFetch(path, body) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 12000);
  try {
    const response = await fetch(`${inquiryEndpoint()}${path}`, {method:body?'POST':'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:abort.signal,
      headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    if (!response.ok) {const error=new Error('咨询接口未完成');error.status=response.status;throw error;}
    const text = await response.text();
    if (text.length > 16000) throw new Error('咨询回执格式未通过核对');
    return JSON.parse(text);
  } finally {clearTimeout(timer);}
}
function inquiryReceipt(receipt) {
  if (!validInquiryReceipt(receipt)) throw new Error('尚未取得有效受理回执');
  inquiryStatus.textContent = `咨询已受理。受理编号：${receipt.submissionId}。请勿重复提交；受理不代表签约或付款，后续处理以工作人员确认为准。`;
  inquiryPending=undefined;
  inquiryRequest=undefined;
  inquiryChallenge=undefined;
  inquiryForm.reset();
  inquirySubmit.disabled=true;
  inquirySubmit.textContent='已受理；如需新咨询请先刷新验证';
  [...inquiryForm.elements].forEach(control => {if(control.name && control.name!=='website')control.disabled=false;});
}
async function refreshInquiry() {
  if(inquiryBusy)return;
  const turn=++inquiryGeneration;inquiryBusy=true;inquirySubmit.disabled=true;inquiryRefresh.disabled=true;
  try {
    inquiryRequest ??= inquiryId();
    const value=await inquiryFetch(`?request=${encodeURIComponent(inquiryRequest)}`);
    if(turn!==inquiryGeneration)return;
    if(value.requestId!==inquiryRequest || typeof value.ticket!=='string' || typeof value.consentNotice!=='string' || typeof value.question!=='string'
      || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt)<=Date.now())throw new Error('咨询入口已过期');
    inquiryChallenge=value;
    document.querySelector('#inquiry-notice').textContent=value.consentNotice;
    document.querySelector('#inquiry-challenge-label').textContent=`计算验证：${value.question}`;
    document.querySelector('#inquiry-answer').value='';
    document.querySelector('#inquiry-consent').checked=false;
    inquirySubmit.disabled=false;
    inquirySubmit.textContent=inquiryPending?'核对原咨询／用原内容重试':'确认提交咨询';
    inquiryStatus.textContent=inquiryPending?'原咨询内容已锁定并保留在当前页面。请重新确认说明、完成验证；系统先查原回执。':'请阅读资料使用说明并完成验证，确认后才会提交。';
  } catch {
    inquiryChallenge=undefined;
    inquiryStatus.textContent='当前咨询接入未就绪、已到期或网络不可用，尚未确认受理。填写内容保留在当前页面，请稍后核对，或通过左侧邮件、电话联系。';
  } finally {if(turn===inquiryGeneration){inquiryBusy=false;inquiryRefresh.disabled=false;}}
}
inquiryRefresh.addEventListener('click',()=>void refreshInquiry());
inquiryForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(inquiryBusy || !inquiryForm.reportValidity())return;
  if(!inquiryChallenge || Date.parse(inquiryChallenge.expiresAt)<=Date.now()){inquiryStatus.textContent='验证已到期，请刷新验证；内容不会清空。';return;}
  const values=new FormData(inquiryForm);
  const answer=String(values.get('answer')||'');
  if(String(values.get('website')||'').trim())return;
  if(!inquiryPending){
    if(!String(values.get('mobile')||'').trim()&&!String(values.get('email')||'').trim()){inquiryStatus.textContent='联系电话和邮箱至少填写一项。';return;}
    const attribution={};
    for(const key of ['utm_source','utm_medium','utm_campaign']){const value=source.get(key);if(value&&/^[\w\u4e00-\u9fff .-]{1,80}$/u.test(value))attribution[key]=value;}
    inquiryPending={requestId:inquiryRequest,website:'',product:String(values.get('product')),contactName:String(values.get('contactName')||'').trim(),companyName:String(values.get('companyName')||'').trim(),mobile:String(values.get('mobile')||'').trim(),email:String(values.get('email')||'').trim(),requirement:String(values.get('requirement')||'').trim(),consentAccepted:true,attribution};
    [...inquiryForm.elements].forEach(control=>{if(['product','contactName','companyName','mobile','email','requirement'].includes(control.name))control.disabled=true;});
  }
  inquiryBusy=true;inquirySubmit.disabled=true;inquiryRefresh.disabled=true;
  try {
    const proof={requestId:inquiryRequest,ticket:inquiryChallenge.ticket,answer};
    // Lookup first, including after an uncertain prior POST. A 404 permits replay of the same immutable payload/key only.
    let receipt;
    try {receipt=await inquiryFetch('/receipt',proof);}catch(error){if(error.status!==404)throw error;}
    if(!receipt)receipt=await inquiryFetch('/submissions',{...inquiryPending,...proof});
    inquiryReceipt(receipt);
  } catch (error) {
    if(error.status===400){inquiryPending=undefined;[...inquiryForm.elements].forEach(control=>{if(control.name)control.disabled=false;});inquiryStatus.textContent='内容或验证未通过，请核对联系方式、需求和计算结果，刷新验证后用原请求编号重试。';inquirySubmit.disabled=false;return;}
    inquiryStatus.textContent='尚未确认受理。原内容和请求编号保留在当前页面，请勿重新填写或重复新建；可刷新验证后再次核对原咨询。若需离开，请先自行保存草稿。';
    inquirySubmit.disabled=false;
    inquirySubmit.textContent='核对原咨询／用原内容重试';
  } finally {inquiryBusy=false;inquiryRefresh.disabled=false;}
});
window.addEventListener('beforeunload',(event)=>{if(inquiryPending){event.preventDefault();event.returnValue='';}});
void refreshInquiry();

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
