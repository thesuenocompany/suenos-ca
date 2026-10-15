-- Apply through Netlify's reviewed migration/deploy flow only.
-- No users, secrets, email addresses or financial content are embedded.
CREATE SCHEMA investor_portal;
REVOKE ALL ON SCHEMA investor_portal FROM PUBLIC;
CREATE TABLE investor_portal.state (
  id smallint PRIMARY KEY CHECK (id = 1),
  payload jsonb NOT NULL,
  CONSTRAINT investor_state_shape CHECK (
    jsonb_typeof(payload) = 'object' AND
    payload ?& ARRAY['members','consents','sessions','events','activeClocks'] AND
    jsonb_typeof(payload->'members') = 'object' AND
    jsonb_typeof(payload->'consents') = 'object' AND
    jsonb_typeof(payload->'sessions') = 'object' AND
    jsonb_typeof(payload->'events') = 'array' AND
    jsonb_typeof(payload->'activeClocks') = 'object'
  )
);
REVOKE ALL ON TABLE investor_portal.state FROM PUBLIC;
INSERT INTO investor_portal.state (id, payload)
VALUES (1, '{"members":{},"consents":{},"sessions":{},"events":[],"activeClocks":{}}');
-- The migration/runtime role must own or have explicit access to this isolated schema.
-- No grants are made to existing unrelated application roles.
