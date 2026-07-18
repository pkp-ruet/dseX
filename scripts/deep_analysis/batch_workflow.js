// Fan-out batch generator for deep-analysis reports (expand phase), with a
// SAVE-AFTER-VERIFY gate so a report with a wrong number or a leak never lands.
//
// Per stock: write (no save) -> independent verify -> if flagged, repair the
// specific issues and re-verify -> save ONLY if the final verify is clean.
// Anything that can't be made clean is reported and left UNSAVED.
//
// Run via the Workflow tool:
//   Workflow({ scriptPath: "scripts/deep_analysis/batch_workflow.js",
//              args: { codes: ["GP","BRACBANK", ...], workdir: "_work" } })
// Get the codes from:  py scripts/deep_analysis/next_batch.py --list  (or --json)

export const meta = {
  name: 'deep-stock-analysis-batch',
  description: 'Generate bilingual deep-analysis reports for many DSE stocks with a save-after-verify gate: write, adversarially verify every figure against the fact pack, repair-and-recheck, and save only clean reports.',
  phases: [
    { title: 'Write', detail: 'per stock: dump facts -> write the durable report (no save)' },
    { title: 'Verify', detail: 'independent check: numbers grounded in figures, no leaks' },
    { title: 'Repair', detail: 'fix flagged issues in place, then re-verify' },
    { title: 'Save', detail: 'persist ONLY reports that pass verification' },
  ],
}

// `args` may arrive as an object OR a JSON string depending on the caller — handle both.
let _args = args
if (typeof _args === 'string') {
  try { _args = JSON.parse(_args) } catch (_e) { _args = {} }
}
const codes = (_args && Array.isArray(_args.codes))
  ? _args.codes.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
  : []
const workdir = (_args && _args.workdir) ? String(_args.workdir) : '_work'

if (!codes.length) {
  log('No codes passed. Pass args.codes = ["GP", ...] (get them from next_batch.py).')
  return { attempted: 0, saved: [], not_saved: [], repaired: [], results: [] }
}
log(`Deep analysis batch (save-after-verify): ${codes.length} stock(s), workdir=${workdir}`)

const WRITE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { code: { type: 'string' }, written: { type: 'boolean' }, note: { type: 'string' } },
  required: ['code', 'written'],
}
const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    code: { type: 'string' },
    grounded: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['code', 'grounded'],
}
const SAVE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { code: { type: 'string' }, saved: { type: 'boolean' }, note: { type: 'string' } },
  required: ['code', 'saved'],
}

const writePrompt = (code) =>
  `You are writing ONE deep-analysis report for DSE stock ${code}, following ` +
  `.claude/skills/deep-stock-analysis/SKILL.md EXACTLY. From the repo root:\n` +
  `1. Run: py scripts/deep_analysis/dump_facts.py --code ${code} --out ${workdir}\n` +
  `2. Read ${workdir}/${code}.json — study the \`figures\` block (numbers already in crore / taka).\n` +
  `3. Write ${workdir}/${code}.analysis.json in the skill's exact output format: the DURABLE ` +
  `narrative only, a full English AND full everyday-Bengali version of every field, all 10 ` +
  `sections in fixed order, each with a one-line takeaway and 2-3 short paragraphs.\n` +
  `HARD RULES: Quote every number from the \`figures\` block — NEVER convert raw ` +
  `financials/extended_financials yourself. No price-relative content (today's price, current ` +
  `P/E or P/B, dividend yield, cheap/fair/expensive stance, fair-value figures, recent returns, ` +
  `52-week position), no scorecard or fair_value block, and no quoting of our score / tier / ` +
  `sector rank. No buy/sell advice, no price predictions. Simple language, no jargon; Western ` +
  `digits in Bengali.\n` +
  `DO NOT run save_analysis — writing the file is your last step. Return {code, written:true} ` +
  `once the file is written.`

const verifyPrompt = (code) =>
  `Adversarially verify the deep-analysis report at ${workdir}/${code}.analysis.json against its ` +
  `fact pack ${workdir}/${code}.json. Read BOTH files. Check:\n` +
  `(a) NUMBERS — every figure in the report matches the fact pack's \`figures\` block (crore / ` +
  `taka). Flag any number that is not in \`figures\`, or is stated with the wrong magnitude or ` +
  `unit (e.g. calling an ৳82-crore figure "a few hundred crore").\n` +
  `(b) NO LEAKS — the report must contain none of: today's price, current P/E or P/B, dividend ` +
  `yield, cheap/fair/expensive stance, a specific fair-value taka figure, recent returns ` +
  `(1m/3m/1y), the 52-week position, the scorecard, or our score / tier / sector rank ` +
  `("Nth of M companies") — all served live.\n` +
  `(c) NO ADVICE — no buy/sell instruction and no future-price prediction.\n` +
  `Be strict: grounded=false if ANY number is wrong/ungrounded OR anything in (b)/(c) leaked. ` +
  `Return {code, grounded, issues} where issues are specific, fixable notes (empty if clean).`

const repairPrompt = (code, issuesText) =>
  `An independent verifier flagged issues in ${workdir}/${code}.analysis.json. Fix ONLY these, ` +
  `editing the file in place and leaving everything else intact. For any number, use the fact ` +
  `pack ${workdir}/${code}.json \`figures\` block (crore / taka) — never convert raw figures. ` +
  `Keep both the English and Bengali versions consistent. Issues:\n${issuesText}\n` +
  `DO NOT run save_analysis. Return {code, written:true} once fixed.`

const savePrompt = (code) =>
  `Run from the repo root: py scripts/deep_analysis/save_analysis.py --code ${code} ` +
  `--file ${workdir}/${code}.analysis.json --facts ${workdir}/${code}.json\n` +
  `If it rejects the file, fix the reported STRUCTURAL problem and re-run. Return {code, saved:true} ` +
  `on a successful upsert.`

const results = await parallel(codes.map((code) => async () => {
  const w = await agent(writePrompt(code),
    { agentType: 'general-purpose', schema: WRITE_SCHEMA, phase: 'Write', label: `write:${code}` })
  if (!w || !w.written) {
    return { code, saved: false, grounded: false, repaired: false, issues: ['write step failed'] }
  }

  let v = await agent(verifyPrompt(code),
    { agentType: 'general-purpose', schema: VERIFY_SCHEMA, phase: 'Verify', label: `verify:${code}` })

  let repaired = false
  if (v && v.grounded === false && (v.issues || []).length) {
    const issuesText = (v.issues || []).map((s, i) => `${i + 1}. ${s}`).join('\n')
    await agent(repairPrompt(code, issuesText),
      { agentType: 'general-purpose', schema: WRITE_SCHEMA, phase: 'Repair', label: `repair:${code}` })
    repaired = true
    v = await agent(verifyPrompt(code),
      { agentType: 'general-purpose', schema: VERIFY_SCHEMA, phase: 'Verify', label: `verify2:${code}` })
  }

  if (v && v.grounded) {
    const s = await agent(savePrompt(code),
      { agentType: 'general-purpose', schema: SAVE_SCHEMA, phase: 'Save', label: `save:${code}` })
    return { code, saved: !!(s && s.saved), grounded: true, repaired, issues: [] }
  }

  // Not clean after repair — do NOT save; report it.
  return { code, saved: false, grounded: false, repaired, issues: (v && v.issues) || ['not grounded after repair'] }
}))

const clean = results.filter(Boolean)
const saved = clean.filter((r) => r.saved)
const notSaved = clean.filter((r) => !r.saved)
const repaired = clean.filter((r) => r.repaired && r.saved)
log(`Done. saved ${saved.length}/${codes.length}` +
    (repaired.length ? `; ${repaired.length} needed a repair` : '') +
    (notSaved.length ? `; NOT saved: ${notSaved.map((r) => r.code).join(', ')}` : ''))

return {
  attempted: codes.length,
  saved: saved.map((r) => r.code),
  repaired: repaired.map((r) => r.code),
  not_saved: notSaved.map((r) => ({ code: r.code, issues: r.issues })),
  results: clean,
}
