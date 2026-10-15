-- REVIEW ONLY. Not in automatic migrations; never applied by the local build.
-- Provisioning and migration require separate approval.
CREATE SCHEMA IF NOT EXISTS investor_portal;
CREATE TABLE investor_portal.state (
  id smallint PRIMARY KEY CHECK (id = 1),
  payload jsonb NOT NULL
);
INSERT INTO investor_portal.state (id, payload)
VALUES (1, '{"members":{},"consents":{},"sessions":{},"events":[],"activeClocks":{}}');
-- Grant only the approved portal runtime role access to this schema/table.
-- Bootstrap the named owner by a separately reviewed data migration; no accounts here.
