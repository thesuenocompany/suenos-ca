import { randomUUID } from 'node:crypto';
import { POLICY_VERSION, memberFor, ownerFor, consentFor, validateEvent, deny } from './policy.mjs';
// All decisions and writes occur inside the same transaction, including revocation.
export function createService(store, { clock = Date.now, retentionDays = 90, maxEvents = 10000, bootstrapOwnerEmail = '' } = {}) {
  const tx = fn => store.transaction(async state => {
    const cutoff = clock() - retentionDays * 86400000;
    state.events = state.events.filter(e => e.at >= cutoff);
    return fn(state);
  });
  return {
    authorize: (identity, owner = false) => tx(s => {
      // One-time app bootstrap for the explicitly approved, provider-verified owner.
      // Existing memberships (including revoked owners) can never be overwritten/recreated.
      if (bootstrapOwnerEmail && identity?.verified && typeof identity.id==='string' && typeof identity.email==='string' && identity.email.toLowerCase()===bootstrapOwnerEmail.toLowerCase() && Object.keys(s.members).length===0) {
        s.members[identity.id]={name:'Owner',email:identity.email.toLowerCase(),active:true,owner:true};
      }
      return structuredClone((owner ? ownerFor : memberFor)(s, identity));
    }),
    me: identity => tx(s => { const m = memberFor(s, identity); return { name: m.name, email: m.email, owner: !!m.owner, consent: consentFor(s, identity.id), policyVersion: POLICY_VERSION }; }),
    consent: (identity, granted, version) => tx(s => {
      memberFor(s, identity);
      if (typeof granted !== 'boolean' || version !== POLICY_VERSION) deny(400, 'Invalid consent choice.');
      const previous = consentFor(s, identity.id);
      s.consents[identity.id] = { granted, version, revision: previous.revision + 1, at: clock() };
      // Withdrawal also removes historical optional events and closes all browser sessions.
      delete s.activeClocks[identity.id];
      if (!granted) s.events = s.events.filter(e => e.memberId !== identity.id);
      for (const [key, value] of Object.entries(s.sessions)) if (value.memberId === identity.id) delete s.sessions[key];
      return s.consents[identity.id];
    }),
    session: identity => tx(s => {
      memberFor(s, identity); const c = consentFor(s, identity.id);
      if (!c.granted || c.version !== POLICY_VERSION) deny(403, 'Optional engagement consent required.');
      const now = clock();
      for (const [key, value] of Object.entries(s.sessions)) if (value.expires <= now) delete s.sessions[key];
      const owned = Object.values(s.sessions).filter(v => v.memberId === identity.id);
      if (owned.length >= 20) deny(429, 'Too many active portal sessions.');
      s.activeClocks[identity.id] ??= now;
      const id = randomUUID(); s.sessions[id] = { memberId: identity.id, revision: c.revision, expires: now + 1800000 };
      return { id, revision: c.revision, expires: now + 1800000 };
    }),
    events: (identity, sessionId, revision, input) => tx(s => {
      memberFor(s, identity); const c = consentFor(s, identity.id), now = clock(), session = s.sessions[sessionId];
      if (!c.granted || c.version !== POLICY_VERSION || c.revision !== revision || !session || session.memberId !== identity.id || session.revision !== revision || session.expires <= now) deny(403, 'Engagement session is no longer valid.');
      if (!Array.isArray(input) || input.length < 1 || input.length > 20) deny(400, 'Send 1–20 events.');
      const validated = input.map(validateEvent);
      if (s.events.length + validated.length > maxEvents) deny(503, 'Engagement capacity reached.');
      const accepted = []; const existing = new Set(s.events.filter(e => e.memberId === identity.id).map(e => e.id));
      const rate = s.events.filter(e => e.memberId === identity.id && e.at > now - 60000).length;
      if (rate + validated.length > 120) deny(429, 'Please slow down.');
      let activeClock = s.activeClocks[identity.id] ?? now;
      for (const event of validated) {
        if (existing.has(event.id)) continue;
        existing.add(event.id);
        if (event.type === 'active_time') {
          // Shared member clock caps all tabs together, independent of client timestamps.
          event.activeMs = Math.min(event.activeMs, Math.max(0, now - activeClock), 15000);
          activeClock = now;
          if (!event.activeMs) continue;
        }
        accepted.push({ ...event, memberId: identity.id, at: now });
      }
      s.activeClocks[identity.id] = activeClock;
      s.events.push(...accepted);
      return { accepted: accepted.length };
    }),
    revoke: (identity, id) => tx(s => {
      ownerFor(s, identity);
      if (typeof id !== 'string' || id === identity.id || !Object.hasOwn(s.members, id) || s.members[id].owner) deny(400, 'Only another investor can be revoked.');
      s.members[id].active = false;
      for (const [key, value] of Object.entries(s.sessions)) if (value.memberId === id) delete s.sessions[key];
      return { revoked: true };
    }),
    report: identity => tx(s => {
      ownerFor(s, identity);
      return { retentionDays, members: Object.entries(s.members).map(([id, m]) => {
        const consent = consentFor(s, id), events = consent.granted ? s.events.filter(e => e.memberId === id) : [];
        const counts = type => events.filter(e => e.type === type).length;
        return { id, name: m.name, email: m.email, owner: !!m.owner, active: m.active, engagement: consent.granted ? 'consented' : 'not collected', views: consent.granted ? counts('slide_view') + counts('section_view') : null, clicks: consent.granted ? counts('click') : null, downloads: consent.granted ? counts('download') : null, activeSeconds: consent.granted ? Math.floor(events.reduce((n,e) => n + (e.activeMs || 0),0)/1000) : null, content: consent.granted ? Object.entries(events.reduce((a,e) => { if (['slide_view','section_view'].includes(e.type)) a[e.contentId]=(a[e.contentId]||0)+1;return a; }, {})).map(([id,views])=>({id,views})) : [] };
      }) };
    })
  };
}
