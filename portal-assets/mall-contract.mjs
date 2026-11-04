/** Public product display only. Website never carries subject IDs, coupons, amounts or payment claims to checkout. */
export function safeMallEndpoint(value, pageHost) {
  const url = new URL(value || 'https://all.hunting-info.ltd/crm/crm-commerce/mall/catalog');
  const production = url.origin === 'https://all.hunting-info.ltd' && url.pathname === '/crm/crm-commerce/mall/catalog';
  const localHosts = ['localhost', '127.0.0.1', '192.168.106.4'];
  const local = localHosts.includes(pageHost) && localHosts.includes(url.hostname) && ['http:', 'https:'].includes(url.protocol)
    && ['/crm-commerce/mall/catalog', '/crm/crm-commerce/mall/catalog'].includes(url.pathname);
  if ((!production && !local) || url.username || url.password || url.search || url.hash) throw new Error('商城公开入口配置无效');
  return url.href;
}
export function publicProducts(value) {
  if (!value || value.code !== 0 || !Array.isArray(value.data) || value.data.length > 200) throw new Error('商品目录未能核对');
  return value.data.filter((row) => row && row.onSale === true).map((row) => {
    if (typeof row.sku !== 'string' || !/^[A-Za-z0-9:_.-]{1,128}$/.test(row.sku) || !['CRM', 'FOOTBALL'].includes(row.product)
      || row.subjectType !== (row.product === 'CRM' ? 'TENANT' : 'USER') || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 200
      || !Number.isSafeInteger(row.priceFen) || row.priceFen < 0 || row.priceFen > 100000000 || !Number.isSafeInteger(row.days) || row.days < 0 || row.days > 3660
      || !['ANNIVERSARY', 'DAYS', 'LIFETIME'].includes(row.periodRule)) throw new Error('商品主体、价格或期限无效');
    return { sku: row.sku, product: row.product, subjectType: row.subjectType, title: row.title, priceFen: row.priceFen, days: row.days, periodRule: row.periodRule };
  });
}
export function addProduct(cart, selected) {
  return [...cart.filter((item) => item.product !== selected.product), selected].slice(0, 2);
}
export function checkoutLink(cart) {
  const skus = cart.map((item) => item.sku);
  if (!skus.length || skus.length > 2 || skus.some((sku) => !/^[A-Za-z0-9:_.-]{1,128}$/.test(sku))) throw new Error('请先选择商品');
  const url = new URL('https://all.hunting-info.ltd/crm/shop');
  url.searchParams.set('items', skus.join(','));
  return url.href;
}
