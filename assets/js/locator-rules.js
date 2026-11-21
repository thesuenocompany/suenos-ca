// Public presentation only. Never change CRM status or infer an unknown venue is a bar.
export const normalizeSearch = value => String(value ?? '').normalize('NFKD')
  .replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const compact = value => normalizeSearch(value).replaceAll(' ', '');
const caProvinces = new Set('ab alberta bc mb manitoba nb nl ns nt nu nunavut on ontario pe qc quebec sk saskatchewan yt yukon'.split(' ').concat([
  'british columbia','new brunswick','newfoundland and labrador','newfoundland','nova scotia','northwest territories','prince edward island'
]));
const mexicoStates = new Set(['jalisco','colima','nayarit','guerrero','baja california','baja california sur','ciudad de mexico','cdmx','quintana roo','mexico','estado de mexico','sonora','yucatan','oaxaca','michoacan','guanajuato','puebla','sinaloa','veracruz','aguascalientes','campeche','chiapas','chihuahua','coahuila','durango','hidalgo','morelos','nuevo leon','queretaro','san luis potosi','tabasco','tamaulipas','tlaxcala','zacatecas']);
const postal = /(?<![a-z\d])[abceghj-nprstvxy]\d[abceghj-nprstv-z]\s?\d[abceghj-nprstv-z]\d(?![a-z\d])/i;
export function countryFor(store) {
  const country = normalizeSearch(store.country);
  if (['ca','can','canada'].includes(country)) return 'ca';
  if (['mx','mex','mexico'].includes(country)) return 'mx';
  if (country) return null;
  const region = normalizeSearch(store.province);
  const address = normalizeSearch(store.address);
  const mx = mexicoStates.has(region) || /\b(?:mexico|jalisco|nayarit|colima)\b/.test(address);
  const ca = caProvinces.has(region) || /\bcanada\b/.test(address) || postal.test(address);
  return mx === ca ? null : mx ? 'mx' : 'ca';
}
export function category(store) {
  // This one public listing was verified as the Vancouver mini-golf bar.
  if (normalizeSearch(store.name) === 'par tee putt' &&
      /\b670 smithe (?:st|street)\b/.test(normalizeSearch(store.address)) &&
      /\bvancouver\b/.test(normalizeSearch([store.city, store.address].join(' ')))) return 'hospitality';
  const type = normalizeSearch(store.type);
  if (/^(?:(?:private|government|provincial|independent) )?(?:liquor (?:store|retailer)|(?:liquor )?retail(?: store)?|grocery(?: store)?|wine store|bottle shop)$/.test(type)) return 'retail';
  if (/^(?:(?:on (?:premise|premises|trade))|hospitality|(?:sports |cocktail |hotel )?bar|restaurants?|pub|lounge|hotel|nightclub|night club|resort|tavern|bar restaurant|restaurant bar|club|cantina)$/.test(type)) return 'hospitality';
  return null;
}
// Coordinates stored alongside a mailing address may point to the post office.
function isMailingAddress(address) {
  return /^(?:(?:p o|po|post office) )?box (?:no )?#?\d+[a-z]?\b/.test(normalizeSearch(address));
}
export function hasPin(store) {
  return !isMailingAddress(store.address) && Number.isFinite(store.lat) && Number.isFinite(store.lng) &&
    Math.abs(store.lat) <= 90 && Math.abs(store.lng) <= 180 && (store.lat !== 0 || store.lng !== 0);
}
export function safeWebsite(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const raw = value.trim(), u = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : 'https://' + raw);
    return /^https?:$/.test(u.protocol) && !u.username && !u.password && u.hostname.includes('.') ? u.href : '';
  } catch { return ''; }
}
export function actionsFor(store) {
  const address = String(store.address ?? '').trim();
  const rawPhone = String(store.phone ?? '').trim();
  const phone = /^\+?[\d\s().-]+$/.test(rawPhone) ? rawPhone.replace(/[^+\d]/g,'') : '';
  const pin = hasPin(store);
  // Ignore name-only records, including those with coordinates of unknown precision.
  const destination = address && !isMailingAddress(address) ? (pin ? `${store.lat},${store.lng}` : `${store.name}, ${address}`) : '';
  return {
    directions: destination ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination) : '',
    call: /^\+?\d{7,15}$/.test(phone) ? 'tel:' + phone : '',
    website: safeWebsite(store.website)
  };
}
export function matchesSearch(store, query) {
  const q = normalizeSearch(query).replace(postal, value => compact(value));
  if (!q) return true;
  const field = normalizeSearch([store.name, store.address, store.city, store.province].filter(Boolean).join(' '))
    .replace(postal, value => compact(value));
  return q.split(' ').every(word => field.includes(word));
}
export function visibleStores(stores, {country='ca', type='retail', query=''} = {}) {
  return stores.filter(store => countryFor(store) === country && category(store) === type &&
    Object.values(actionsFor(store)).some(Boolean) && matchesSearch(store, query));
}
