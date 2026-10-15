-- Separate authentication records from optional engagement data inside the
-- existing locked state row; no PINs, identities or secrets in this migration.
UPDATE investor_portal.state SET payload=jsonb_set(payload,'{pin}',
 '{"credentials":{},"sessions":{},"limits":{}}'::jsonb) WHERE NOT payload ? 'pin';
ALTER TABLE investor_portal.state ADD CONSTRAINT investor_pin_state_shape CHECK (
 payload ? 'pin' AND jsonb_typeof(payload->'pin')='object' AND
 jsonb_typeof(payload->'pin'->'credentials')='object' AND
 jsonb_typeof(payload->'pin'->'sessions')='object' AND
 jsonb_typeof(payload->'pin'->'limits')='object'
);
