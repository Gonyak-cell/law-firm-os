#!/usr/bin/env node
// validate-launch-tuw-ledger.mjs — planning-only 검증기 (의존성 0)
// 검사군 8종: ID 규칙 / 의존성 DAG / 보일러플레이트 / VC 커버리지 / 게이트 커버리지 / 자동-A 키워드 / 가중치·granularity / MD↔JSON 정합
// 사용: node workbook/launch-tuw/validate-launch-tuw-ledger.mjs   (exit 0 = 위반 0)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const ledger = JSON.parse(readFileSync(join(dir, 'launch-tuw-ledger.json'), 'utf8'));
const { meta, vc_catalog, binding_rules, external_dependency_registry, work_packages, tuws } = ledger;

const errors = [];
const warns = [];
const err = (group, msg) => errors.push(`[${group}] ${msg}`);

const TUW_RE = /^LT-(PRE|L[0-9])-W\d{2}-T\d{2}$/;
const WPREF_RE = /^WP:LT-(PRE|L[0-9])-W\d{2}$/;
const wpById = new Map(work_packages.map(w => [w.wp_id, w]));
const tuwById = new Map();
const phaseIdx = p => meta.phase_order.indexOf(p);
const phaseOf = id => id.split('-')[1];
const wpOf = id => id.split('-').slice(0, 3).join('-');
const allVcs = new Set([...vc_catalog.existing, ...vc_catalog.launch_extensions]);
const GENERIC_METHODS = ['테스트 통과', '기능 동작', '검증 완료', '확인', '리뷰 통과'];

// ── 1. ID 규칙 ───────────────────────────────────────────────
for (const t of tuws) {
  if (!TUW_RE.test(t.id)) err('ID', `형식 위반: ${t.id}`);
  if (tuwById.has(t.id)) err('ID', `중복: ${t.id}`);
  tuwById.set(t.id, t);
  const wp = wpOf(t.id);
  if (!wpById.has(wp)) err('ID', `${t.id}: 레지스트리에 없는 WP ${wp}`);
}
const wpGoal = new Set(work_packages.map(w => w.goal_id));
if (wpGoal.size !== work_packages.length) err('ID', 'goal_id 중복 존재');

// ── 2. 의존성 DAG ────────────────────────────────────────────
// terminal: WP당 정확히 1개
const termByWp = new Map();
for (const t of tuws.filter(t => t.status !== 'withdrawn')) {
  if (t.terminal) {
    const wp = wpOf(t.id);
    if (termByWp.has(wp)) err('DAG', `${wp}: terminal 2개 이상 (${termByWp.get(wp)}, ${t.id})`);
    termByWp.set(wp, t.id);
  }
}
for (const w of work_packages) {
  const has = tuws.some(t => wpOf(t.id) === w.wp_id && t.status !== 'withdrawn');
  if (has && !termByWp.has(w.wp_id)) err('DAG', `${w.wp_id}: terminal TUW 없음`);
}
const resolveDep = (d, from) => {
  if (TUW_RE.test(d)) {
    if (!tuwById.has(d)) { err('DAG', `${from}: 존재하지 않는 선행 ${d}`); return null; }
    return d;
  }
  if (WPREF_RE.test(d)) {
    const wp = d.slice(3);
    if (!wpById.has(wp)) { err('DAG', `${from}: 존재하지 않는 WP 참조 ${d}`); return null; }
    const term = termByWp.get(wp);
    if (!term) { err('DAG', `${from}: ${d} 의 terminal 미존재`); return null; }
    return term;
  }
  err('DAG', `${from}: 자유 텍스트 선행 금지 — "${d}"`);
  return null;
};
const adj = new Map();
for (const t of tuws.filter(t => t.status !== 'withdrawn')) {
  const deps = (t.depends_on || []).map(d => resolveDep(d, t.id)).filter(Boolean);
  if (deps.includes(t.id)) err('DAG', `${t.id}: 자기 참조`);
  if ((t.depends_on || []).length === 0 && !t.entry_point) err('DAG', `${t.id}: 선행 없음인데 entry_point 미선언`);
  for (const d of deps) {
    if (phaseIdx(phaseOf(d)) > phaseIdx(phaseOf(t.id)))
      err('DAG', `${t.id}(${phaseOf(t.id)}) → ${d}(${phaseOf(d)}): 후행 phase 의존 금지`);
  }
  adj.set(t.id, deps);
}
// 위상 정렬 (Kahn)
{
  const indeg = new Map([...adj.keys()].map(k => [k, 0]));
  for (const deps of adj.values()) for (const d of deps) if (indeg.has(d)) indeg.set(d, indeg.get(d)); // dep direction: t depends on d => edge d->t
  const rev = new Map([...adj.keys()].map(k => [k, []]));
  for (const [t, deps] of adj) { for (const d of deps) { if (rev.has(d)) rev.get(d).push(t); indeg.set(t, (indeg.get(t) || 0)); } }
  for (const [t, deps] of adj) indeg.set(t, deps.length);
  const q = [...indeg].filter(([, v]) => v === 0).map(([k]) => k);
  let seen = 0;
  while (q.length) { const n = q.shift(); seen++; for (const m of (rev.get(n) || [])) { indeg.set(m, indeg.get(m) - 1); if (indeg.get(m) === 0) q.push(m); } }
  if (seen !== adj.size) err('DAG', `순환 의존 존재: 위상 정렬 ${seen}/${adj.size}`);
}

// ── 3. 보일러플레이트 검출 ──────────────────────────────────
const norm = s => String(s).toLowerCase().replace(/[\s,.·、~:;()\[\]"'`-]/g, '');
const acFreq = new Map();
for (const t of tuws) {
  for (const ac of (t.acceptance_criteria || [])) {
    const k = norm(ac);
    acFreq.set(k, (acFreq.get(k) || []).concat(t.id));
  }
  const m = t.verification_contract?.method || '';
  if (!m.trim()) err('BOILER', `${t.id}: verification_contract.method 비어 있음`);
  else if (GENERIC_METHODS.some(g => norm(m) === norm(g))) err('BOILER', `${t.id}: 일반 문구 method — "${m}"`);
  if (!(t.acceptance_criteria || []).length) err('BOILER', `${t.id}: acceptance_criteria 없음`);
}
for (const [k, ids] of acFreq) if (ids.length > 4) err('BOILER', `동일 완료 기준 ${ids.length}회 반복: "${k.slice(0, 40)}…" (${ids.slice(0, 6).join(', ')}…)`);

// ── 4. VC 커버리지 ──────────────────────────────────────────
for (const t of tuws) {
  const vcs = t.verification_contract?.vc_bindings || [];
  if (!vcs.length) err('VC', `${t.id}: vc_bindings 0개`);
  for (const v of vcs) if (!allVcs.has(v)) err('VC', `${t.id}: 카탈로그에 없는 VC ${v}`);
  const mand = binding_rules[t.work_type];
  if (!mand) err('VC', `${t.id}: 알 수 없는 work_type ${t.work_type}`);
  else for (const v of mand) if (!vcs.includes(v)) err('VC', `${t.id}: work_type=${t.work_type} 의무 VC ${v} 누락`);
  if (t.risk_class === 'A' && vcs.length < 2) err('VC', `${t.id}: Risk A는 VC 2종 이상 필요`);
}

// ── 5. 게이트 커버리지 ──────────────────────────────────────
const gateHit = new Map(meta.gates.map(g => [g, 0]));
for (const t of tuws) for (const g of (t.gate_binding || [])) {
  if (!gateHit.has(g)) err('GATE', `${t.id}: 정의되지 않은 게이트 ${g}`);
  else gateHit.set(g, gateHit.get(g) + 1);
}
for (const [g, n] of gateHit) if (n === 0) err('GATE', `게이트 ${g}: 바인딩된 TUW 0개`);

// ── 6. 자동-A 키워드 감사 ───────────────────────────────────
for (const t of tuws) {
  const hay = [t.title, t.objective, ...(t.deliverables || [])].join(' ').toLowerCase();
  const hit = meta.auto_risk_a_keywords.find(k => hay.includes(k.toLowerCase()));
  if (hit && t.risk_class !== 'A') err('RISK', `${t.id}: 자동-A 키워드 "${hit}" 검출 — risk_class=A 필요(현재 ${t.risk_class})`);
  if (['A'].includes(t.risk_class) || ['runtime_write', 'migration', 'm365_integration'].includes(t.work_type)) {
    if (!t.permission_audit_impact) err('RISK', `${t.id}: permission_audit_impact 필수(조건부 필드)`);
  }
}

// ── 7. 가중치·enum·granularity ──────────────────────────────
for (const t of tuws) {
  if (!meta.weights.includes(t.weight)) err('FIELD', `${t.id}: weight=${t.weight} (XH 금지·L/M/H만)`);
  if (!meta.risk_classes.includes(t.risk_class)) err('FIELD', `${t.id}: risk_class=${t.risk_class}`);
  if (!meta.executors.includes(t.executor)) err('FIELD', `${t.id}: executor=${t.executor}`);
  for (const e of (t.external_dependencies || [])) if (!external_dependency_registry[e]) err('FIELD', `${t.id}: 미등록 외부 의존 ${e}`);
  if (!(t.source_refs || []).length) err('FIELD', `${t.id}: source_refs 없음`);
  if (!(t.deliverables || []).length) err('FIELD', `${t.id}: deliverables 없음`);
  const wp = wpById.get(wpOf(t.id));
  if (wp?.granularity === 'provisional' && !wp.rebaseline_after) err('FIELD', `${wp.wp_id}: provisional인데 rebaseline_after 없음`);
}

// ── 8. MD↔JSON 정합 ─────────────────────────────────────────
const mdIds = new Set();
for (const f of readdirSync(dir).filter(f => /^\d{2}_.*\.md$/.test(f) && !f.startsWith('00_') && !f.startsWith('90_'))) {
  const text = readFileSync(join(dir, f), 'utf8');
  for (const m of text.matchAll(/^####\s+(LT-\S+)\s+—/gm)) mdIds.add(m[1]);
}
for (const t of tuws) if (!mdIds.has(t.id)) err('SYNC', `JSON에만 존재(MD 누락): ${t.id}`);
for (const id of mdIds) if (!tuwById.has(id)) err('SYNC', `MD에만 존재(JSON 누락): ${id}`);

// ── 보고 ────────────────────────────────────────────────────
const byPhase = {};
for (const t of tuws) { const p = phaseOf(t.id); byPhase[p] = (byPhase[p] || 0) + 1; }
console.log(`TUW 총수: ${tuws.length} | WP: ${work_packages.length} | phase별: ${JSON.stringify(byPhase)}`);
console.log(`게이트 커버리지: ${[...gateHit].map(([g, n]) => `${g}:${n}`).join(' ')}`);
if (warns.length) console.log(`경고 ${warns.length}건:\n` + warns.map(w => '  ! ' + w).join('\n'));
if (errors.length) {
  console.error(`\n위반 ${errors.length}건:`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('위반 0건 — PASS');
