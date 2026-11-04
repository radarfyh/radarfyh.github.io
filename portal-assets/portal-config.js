'use strict';
// Public CRM form capability only; no account or internal credentials.
// Target enterprise/source are bound only in the CRM server configuration; no form token or tenant is embedded here.
window.HUNTING_PORTAL_CONFIG = Object.freeze({
  crmMallApi: 'https://all.hunting-info.ltd/crm/crm-commerce/mall/catalog',
  crmInquiryApi: 'https://all.hunting-info.ltd/crm/crm-public/v1/website-inquiries'
});
