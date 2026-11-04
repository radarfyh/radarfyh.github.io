import { addProduct, checkoutLink, publicProducts, safeMallEndpoint } from './mall-contract.mjs';
const area = document.querySelector('#product-mall');
if (area) {
  const english = area.dataset.language === 'en';
  const text = (zh, en) => english ? en : zh;
  const list = area.querySelector('[data-mall-products]');
  const status = area.querySelector('[data-mall-status]');
  const selection = area.querySelector('[data-mall-cart]');
  const checkout = area.querySelector('[data-mall-checkout]');
  const refresh = area.querySelector('[data-mall-refresh]');
  let cart = [];
  let generation = 0;
  let controller;
  const money = (fen) => new Intl.NumberFormat(english ? 'en-US' : 'zh-CN', { style: 'currency', currency: 'CNY' }).format(fen / 100);
  const node = (tag, value) => { const element = document.createElement(tag); if (value !== undefined) element.textContent = value; return element; };
  function drawCart() {
    selection.replaceChildren();
    if (!cart.length) selection.append(node('p', text('购物车为空。每类产品可选一项。', 'Your cart is empty. Choose one plan per product.')));
    for (const item of cart) {
      const row = node('div'); row.className = 'mall-selection';
      row.append(node('span', `${item.title} · ${money(item.priceFen)}`));
      const remove = node('button', text('移除', 'Remove')); remove.type = 'button'; remove.className = 'button outline';
      remove.addEventListener('click', () => { cart = cart.filter((value) => value.sku !== item.sku); drawCart(); });
      row.append(remove); selection.append(row);
    }
    checkout.hidden = !cart.length;
    if (cart.length) checkout.href = checkoutLink(cart, window.HUNTING_PORTAL_CONFIG?.crmCheckoutUrl, location.hostname); else checkout.removeAttribute('href');
  }
  async function load() {
    const turn = ++generation;
    controller?.abort(); controller = new AbortController(); const active = controller;
    const timer = setTimeout(() => active.abort(), 10000);
    refresh.disabled = true; status.textContent = text('正在读取当前商品…', 'Loading current products…');
    try {
      const endpoint = safeMallEndpoint(window.HUNTING_PORTAL_CONFIG?.crmMallApi, location.hostname);
      const response = await fetch(endpoint, { credentials: 'omit', cache: 'no-store', redirect: 'error', signal: active.signal });
      if (!response.ok) throw new Error('catalogue unavailable');
      const body = await response.text(); if (body.length > 200000) throw new Error('catalogue too large');
      const products = publicProducts(JSON.parse(body)); if (turn !== generation) return;
      list.replaceChildren();
      for (const item of products) {
        const card = node('article'); card.className = 'membership-card mall-product';
        const subject = node('span', item.subjectType === 'TENANT' ? text('企业权益', 'Enterprise subscription') : text('个人权益', 'Personal membership'));
        subject.className = 'membership-index'; card.append(subject, node('h3', item.title), node('p', money(item.priceFen)));
        card.append(node('p', item.periodRule === 'ANNIVERSARY' ? text('一年，按上海时区周年计算', 'One year, anniversary in Asia/Shanghai') : item.periodRule === 'LIFETIME' ? text('长期免费', 'Free basic plan') : text(`连续${item.days}天`, `${item.days} consecutive days`)));
        const add = node('button', text('加入购物车', 'Add to cart')); add.type = 'button'; add.className = 'button primary';
        add.addEventListener('click', () => { cart = addProduct(cart, item); drawCart(); });
        const detail = node('details'); detail.append(node('summary', text('权益与办理说明', 'Details and eligibility')),
          node('p', item.product === 'CRM' ? text('CRM由当前企业管理员办理；具体功能、试用资格和额度请在企业订阅页核对。', 'CRM checkout requires your enterprise administrator. Review features, trial eligibility and quotas in the subscription centre.') : text('Feng球探由本人购买，分析不承诺比赛结果或收益。', 'Feng Scout is a personal membership. Analysis does not guarantee outcomes or returns.')));
        card.append(detail, add); list.append(card);
      }
      // Only retain still-on-sale product identities; checkout rechecks the authoritative price and subject.
      cart = cart.flatMap((item) => products.filter((value) => value.sku === item.sku)); drawCart();
      status.textContent = products.length ? text('价格由会员服务读取，结算时重新确认。', 'Prices come from the membership service and are checked again at checkout.') : text('暂无在售商品。', 'No products are currently on sale.');
    } catch {
      if (turn !== generation) return;
      list.replaceChildren(); cart = []; drawCart();
      status.textContent = text('商品目录暂不可用。请稍后刷新，或直接进入产品内查看套餐；当前没有创建订单或扣款。', 'The catalogue is unavailable. Retry later or review plans inside the product. No order or charge has been created.');
    } finally { clearTimeout(timer); if (turn === generation) refresh.disabled = false; }
  }
  refresh.addEventListener('click', load);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { generation++; controller?.abort(); refresh.disabled = false; } });
  window.addEventListener('pagehide', () => { generation++; controller?.abort(); cart = []; });
  drawCart(); void load();
}
