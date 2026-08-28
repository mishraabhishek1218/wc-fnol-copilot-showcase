// Illustrates the "deterministic, explainable" design principle from the README:
// triage severity is rule-based (no LLM), auditable, and produces both a tier
// and a human-readable list of flags/actions an HR reviewer can trust.
//
// Trimmed excerpt — shows the shape of the rule engine, not the full tuned
// rule set (thresholds, scoring weights, and the complete branch list are
// omitted; the real engine has ~15 weighted signals feeding into tier/score).

import type { TriageInput, TriageResult } from "./triage-input";

/**
 * Rule-based triage for MVP — auditable, no LLM. Tier is the max severity
 * signal across weighted rule branches (fatality language, ER/hospitalization,
 * lost time, self-reported pain, high-risk body parts, injury mechanism, ...).
 */
export function scoreTriage(input: TriageInput): TriageResult {
  let tier: 1 | 2 | 3 | 4 = 1;
  const flags: TriageResult["triage_flags"] = [];
  const actions: string[] = [];

  if (suggestsFatality(input)) {
    tier = 4;
    flags.push({ code: "fatality_signal", label: "Fatality-related language in report" });
    actions.push("Escalate to senior claims leadership immediately");
    return finalize(tier, flags, actions);
  }

  // ...additional weighted rule branches (ER/hospitalization, lost time,
  // pain score, high-risk body parts, injury mechanism) each contribute to
  // `tier` and `flags` the same way — omitted here.

  return finalize(tier, flags, actions);
}

function suggestsFatality(input: TriageInput): boolean {
  const text = `${input.incident_description ?? ""} ${input.injury_type ?? ""}`.toLowerCase();
  return /\bfatal(ity)?\b/.test(text) || /\bdeath\b/.test(text);
}

function finalize(
  tier: 1 | 2 | 3 | 4,
  flags: TriageResult["triage_flags"],
  actions: string[],
): TriageResult {
  // Real implementation also computes a bounded 0-100 score with a
  // tier-floor — omitted here along with the exact scoring weights.
  return { triage_tier: tier, triage_flags: flags, recommended_actions: [...new Set(actions)] } as TriageResult;
}
