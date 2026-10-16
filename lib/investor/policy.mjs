export const POLICY_VERSION = 'investor-engagement-v1';
export const DECK_VERSION = 'partner-october-2026-v2';
export class PortalError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const deny = (status, message) => { throw new PortalError(status, message); };
export function memberFor(state, identity) {
  if (!identity?.id || !identity.email || !identity.verified) deny(401, 'Verified sign-in required.');
  const member = Object.hasOwn(state.members, identity.id) ? state.members[identity.id] : null;
  if (!member?.active || member.email.toLowerCase() !== identity.email.toLowerCase()) deny(403, 'Access has not been approved.');
  return member;
}
export function ownerFor(state, identity) {
  const member = memberFor(state, identity);
  if (!member.owner) deny(403, 'Owner access required.');
  return member;
}
export function sameOrigin(request, origin) {
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') deny(403, 'Origin not allowed.');
}
export function consentFor(state, id) { return state.consents[id] || { granted: false, version: POLICY_VERSION, revision: 0 }; }
export function validateEvent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) deny(400, 'Invalid event.');
  const allowed = ['id','type','contentId','deckVersion','activeMs'];
  if (Object.keys(raw).some(k => !allowed.includes(k))) deny(400, 'Unexpected event fields.');
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(raw.id || '')) deny(400, 'Invalid event ID.');
  if (raw.deckVersion !== DECK_VERSION) deny(400, 'Unknown deck version.');
  const slides = /^slide-(0[1-9]|1[0-4])$/;
  const sections = new Set(['home','story','round','plan','financials','funds','pineapple','library','review']);
  const type = raw.type;
  const valid = type === 'slide_view' ? slides.test(raw.contentId) : type === 'section_view' ? sections.has(raw.contentId) : type === 'click' ? new Set(['read-deck','financial-year','roadmap-year','fund-detail']).has(raw.contentId) : type === 'download' ? new Set(['deck-pdf','deck-pptx']).has(raw.contentId) : type === 'active_time' ? raw.contentId === 'portal' : false;
  if (!valid) deny(400, 'Unknown event or content ID.');
  if (type === 'active_time' && (!Number.isInteger(raw.activeMs) || raw.activeMs < 1 || raw.activeMs > 15000)) deny(400, 'Invalid active duration.');
  if (type !== 'active_time' && raw.activeMs !== undefined) deny(400, 'Unexpected active duration.');
  return { id: raw.id, type, contentId: raw.contentId, deckVersion: raw.deckVersion, ...(type === 'active_time' ? { activeMs: raw.activeMs } : {}) };
}
