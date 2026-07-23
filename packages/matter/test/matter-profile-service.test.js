import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createMatterProfile,
  createMatterRepository,
  listMatterStakeholders,
  profileKindForMatter,
  registerMatterStakeholder,
  updateMatterProfile,
} from "../src/index.js";

const tenant_id = "tenant-matter-profile";
const actor_id = "user-matter-profile";

function matter(overrides = {}) {
  return {
    model_type: "Matter",
    matter_id: "matter-profile",
    tenant_id,
    client_id: "client-profile",
    title: "Matter profile contract",
    status: "opening",
    created_by: actor_id,
    created_at: "2026-07-10T00:00:00.000Z",
    permission_envelope_id: "perm-matter-profile",
    audit_trace_id: "audit-matter-profile",
    ...overrides,
  };
}

const profiles = [
  {
    label: "civil",
    matter: { matter_type_english: "LIT", matter_litigation_axis: "CIV" },
    expected: "civil_litigation",
    data: { jurisdiction_court: "서울중앙지방법원", case_number: "2026가합1001", case_name: "매매대금 청구" },
  },
  {
    label: "criminal",
    matter: { matter_type_english: "LIT", matter_litigation_axis: "CRM" },
    expected: "criminal_litigation",
    data: { police_case_number: "2026-123", prosecution_sibling_number: "2026형제456", prosecution_office: "서울중앙지방검찰청", criminal_case_number: "2026고단789" },
  },
  {
    label: "administrative",
    matter: { matter_type_english: "LIT", matter_litigation_axis: "ADM" },
    expected: "administrative_litigation",
    data: { agency_name: "공정거래위원회", administrative_case_number: "2026행심10", case_name: "시정명령 취소" },
  },
  {
    label: "deal",
    matter: { matter_type_english: "DEAL" },
    expected: "deal",
    data: { transaction_value: { amount: 2500000000, currency: "KRW", basis: "equity_value" }, stage: "due_diligence", counterparty_name: "상대방 주식회사", counterparty_law_firm: "상대방 법무법인" },
  },
  {
    label: "corporate advisory",
    matter: { matter_type_english: "Advisory" },
    expected: "corporate_advisory",
    data: { advisory_topic: "이사회 및 지배구조", engagement_mode: "retainer", stage: "drafting", request_scope: "정관 및 이사회 운영 자문" },
  },
];

test("Matter profiles validate all five type-specific contracts, persist, and retain only contact references", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "matter-profile-")), "store.json");
  const repository = createMatterRepository({ filePath });

  for (const fixture of profiles) {
    const currentMatter = matter({ matter_id: `matter-profile-${fixture.label}`, ...fixture.matter });
    repository.create(currentMatter);
    assert.equal(profileKindForMatter(currentMatter), fixture.expected);
    const profile = createMatterProfile({
      repository,
      matter: currentMatter,
      actor_id,
      profile: { data: fixture.data, evidence: { source_ref: `fixtures/${fixture.label}.json`, review_status: "review_required" } },
    });
    assert.equal(profile.profile_kind, fixture.expected);
    assert.equal(profile.evidence.review_status, "review_required");
    assert.equal(profile.raw_contact_values_included, false);
  }

  const criminalMatter = repository.get({ tenant_id, model_type: "Matter", matter_id: "matter-profile-criminal" });
  const stakeholder = registerMatterStakeholder({
    repository,
    matter: criminalMatter,
    actor_id,
    stakeholder: {
      display_name: "수사관 A",
      organization_name: "서울중앙경찰서",
      relationship_role: "police_officer",
      contact_mode: "crm_contact",
      contact_id: "crm-contact-001",
      contact_point_id: "crm-contact-point-001",
    },
  });
  assert.equal(stakeholder.contact_id, "crm-contact-001");
  assert.equal(stakeholder.contact_value, undefined);
  assert.equal(listMatterStakeholders({ repository, tenant_id, matter_id: criminalMatter.matter_id }).length, 1);

  const updated = updateMatterProfile({
    repository,
    matter: criminalMatter,
    actor_id,
    patch: { data: { ...profiles[1].data, criminal_case_number: "2026고단790", police_officer_stakeholder_id: stakeholder.stakeholder_id } },
  });
  assert.equal(updated.data.criminal_case_number, "2026고단790");
  assert.equal(updated.data.police_officer_stakeholder_id, stakeholder.stakeholder_id);
  assert.throws(
    () => updateMatterProfile({ repository, matter: criminalMatter, actor_id, patch: { data: { prosecutor_stakeholder_id: stakeholder.stakeholder_id } } }),
    /stakeholder reference is invalid/,
  );

  const otherMatter = matter({ matter_id: "matter-profile-other", matter_type_english: "LIT", matter_litigation_axis: "CRM" });
  repository.create(otherMatter);
  const otherStakeholder = registerMatterStakeholder({
    repository,
    matter: otherMatter,
    actor_id,
    stakeholder: { display_name: "다른 사건 수사관", relationship_role: "police_officer" },
  });
  assert.throws(
    () => updateMatterProfile({ repository, matter: criminalMatter, actor_id, patch: { data: { police_officer_stakeholder_id: otherStakeholder.stakeholder_id } } }),
    /stakeholder reference is invalid/,
  );

  repository.close();
  const reopened = createMatterRepository({ filePath });
  assert.equal(reopened.get({ tenant_id, model_type: "MatterProfile", resource_id: "matter_profile_matter-profile-deal" }).profile_kind, "deal");
  assert.equal(listMatterStakeholders({ repository: reopened, tenant_id, matter_id: criminalMatter.matter_id })[0].contact_point_id, "crm-contact-point-001");
});

test("Matter profile rejects a cross-type field and raw contact values", () => {
  const repository = createMatterRepository();
  const currentMatter = matter({ matter_type_english: "LIT", matter_litigation_axis: "CIV" });
  repository.create(currentMatter);
  assert.throws(
    () => createMatterProfile({ repository, matter: currentMatter, actor_id, profile: { data: { stage: "due_diligence" } } }),
    /not allowed/,
  );
  assert.throws(
    () => registerMatterStakeholder({ repository, matter: currentMatter, actor_id, stakeholder: { display_name: "법원 주무관", relationship_role: "court_clerk", contact_value: "02-0000-0000" } }),
    /raw contact values/i,
  );
  assert.throws(
    () => registerMatterStakeholder({ repository, matter: currentMatter, actor_id, stakeholder: { display_name: "수사관", relationship_role: "police_officer", telephone: "02-0000-0000" } }),
    /raw contact values/i,
  );
  assert.throws(
    () => registerMatterStakeholder({ repository, matter: currentMatter, actor_id, stakeholder: { display_name: "수사관", relationship_role: "police_officer", contact_mode: "crm_contact", contact_id: "010-1234-5678" } }),
    /opaque reference/i,
  );
  assert.throws(
    () => registerMatterStakeholder({ repository, matter: currentMatter, actor_id, stakeholder: { display_name: "수사관", relationship_role: "police_officer", contact_mode: "crm_contact", contact_id: `${"a".repeat(20_000)}@example.com` } }),
    /opaque reference/i,
  );
  assert.throws(
    () => registerMatterStakeholder({ repository, matter: currentMatter, actor_id, stakeholder: { display_name: "역할 없음" } }),
    /relationship_role is required/,
  );
  const generatedId = registerMatterStakeholder({
    repository,
    matter: currentMatter,
    actor_id,
    stakeholder: { stakeholder_id: "010-1234-5678", display_name: "법원 연락 담당", relationship_role: "court_contact" },
    occurred_at: "2026-07-21T00:00:00.000Z",
  });
  assert.doesNotMatch(generatedId.stakeholder_id, /010[-_]?1234[-_]?5678/u);
});
