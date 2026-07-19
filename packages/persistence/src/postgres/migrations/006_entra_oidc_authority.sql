ALTER TABLE lawos_identity.accounts
  ADD COLUMN federated_tenant_id text,
  ADD COLUMN federated_subject_id text;

ALTER TABLE lawos_identity.accounts
  ADD CONSTRAINT identity_federated_subject_pair_check CHECK (
    (federated_tenant_id IS NULL AND federated_subject_id IS NULL)
    OR (federated_tenant_id IS NOT NULL AND federated_subject_id IS NOT NULL)
  );

CREATE UNIQUE INDEX identity_federated_subject_index
  ON lawos_identity.accounts (tenant_id, credential_provider, federated_tenant_id, federated_subject_id)
  WHERE federated_subject_id IS NOT NULL;

ALTER TABLE lawos_identity.challenges
  DROP CONSTRAINT challenges_challenge_type_check;

ALTER TABLE lawos_identity.challenges
  ADD CONSTRAINT challenges_challenge_type_check
  CHECK (challenge_type IN ('password_reset', 'step_up', 'oidc_login'));
