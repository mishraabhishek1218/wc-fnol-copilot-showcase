// Illustrates the "deterministic, explainable" design principle from the README:
// triage severity is rule-based (no LLM), auditable, and produces both a tier
// and a human-readable list of flags/actions an HR reviewer can trust.

import type { TriageInput, TriageResult } from "./triage-input";
import { TRIAGE_RULES_VERSION } from "./triage-input";

const HIGH_RISK_BODY_PARTS = new Set(["head_neck", "neck", "back_lower", "spine"]);

function hasLostTime(input: TriageInput): boolean {
  return input.lost_time_confirmed === true || input.lost_time_indicator === true;
}

function isErOrHospital(treatment: string | null): boolean {
  return treatment === "emergency_room" || treatment === "hospitalization";
}

function isMedicalVisit(treatment: string | null): boolean {
  return treatment === "doctor" || treatment === "urgent_care";
}

function isMinorTreatment(treatment: string | null): boolean {
  return treatment === "none" || treatment === "first_aid";
}

function suggestsFatality(input: TriageInput): boolean {
  const text = `${input.incident_description ?? ""} ${input.injury_type ?? ""}`
    .toLowerCase()
    .trim();
  return /\bfatal(ity)?\b/.test(text) || /\bdeath\b/.test(text);
}

/**
 * Rule-based triage for MVP — auditable, no LLM. Tier is the max severity signal; score 0–100.
 */
export function scoreTriage(input: TriageInput): TriageResult {
  let tier: 1 | 2 | 3 | 4 = 1;
  let score = 18;
  const flags: TriageResult["triage_flags"] = [];
  const actions: string[] = [];

  const treatment = input.medical_treatment_received;
  const lostTime = hasLostTime(input);
  const pain = input.injury_severity_self_report ?? 0;
  const bodyParts = input.body_parts_affected ?? [];

  if (suggestsFatality(input)) {
    tier = 4;
    score = 98;
    flags.push({ code: "fatality_signal", label: "Fatality-related language in report" });
    actions.push("Escalate to senior claims leadership immediately");
    actions.push("Preserve scene documentation and notify legal per protocol");
    return finalize(tier, score, flags, actions);
  }

  if (isErOrHospital(treatment)) {
    tier = Math.max(tier, 3) as 1 | 2 | 3 | 4;
    score = Math.max(score, 78);
    flags.push({
      code: "er_treatment",
      label: "Emergency room or hospitalization indicated",
    });
    actions.push("Assign senior examiner within 4 business hours");
    if (treatment === "hospitalization") {
      tier = 4;
      score = Math.max(score, 92);
      flags.push({ code: "hospitalization", label: "Hospitalization reported" });
      actions.push("Initiate nurse triage outreach within 2 hours");
    }
  }

  if (lostTime) {
    tier = Math.max(tier, 3) as 1 | 2 | 3 | 4;
    score = Math.max(score, 68);
    flags.push({
      code: "lost_time",
      label: "Lost time expected or confirmed",
    });
    actions.push("Confirm wage and schedule data with payroll");
  }

  if (isMedicalVisit(treatment) && !lostTime && tier < 3) {
    tier = Math.max(tier, 2) as 1 | 2 | 3 | 4;
    score = Math.max(score, 48);
    flags.push({
      code: "medical_treatment",
      label: "Medical treatment beyond first aid",
    });
    actions.push("Request medical documentation when available");
  }

  if (isMinorTreatment(treatment) && !lostTime && tier === 1) {
    score = Math.max(score, 22);
    flags.push({
      code: "minor_treatment",
      label: "First aid or no treatment reported",
    });
    actions.push("Monitor for symptom change within 48 hours");
  }

  if (pain >= 7) {
    score = Math.min(100, score + 12);
    flags.push({
      code: "high_pain",
      label: `High self-reported pain (${pain}/10)`,
    });
    if (tier < 2) tier = 2;
  }

  const highRiskPart = bodyParts.find((p) => HIGH_RISK_BODY_PARTS.has(p));
  if (highRiskPart) {
    score = Math.min(100, score + 10);
    tier = Math.max(tier, 2) as 1 | 2 | 3 | 4;
    flags.push({
      code: "high_risk_body",
      label: "Head, neck, or spine area reported",
    });
  }

  if (bodyParts.length >= 3) {
    score = Math.min(100, score + 6);
    flags.push({
      code: "multiple_body_areas",
      label: "Multiple body areas affected",
    });
  }

  if (input.injury_mechanism === "fall") {
    score = Math.min(100, score + 5);
    flags.push({ code: "fall_mechanism", label: "Fall mechanism reported" });
  }

  if (tier >= 3 && !actions.includes("Notify HR and safety within 1 business day")) {
    actions.push("Notify HR and safety within 1 business day");
  }

  if (tier === 1 && actions.length === 0) {
    actions.push("Standard FNOL review queue");
  }

  return finalize(tier, score, flags, actions);
}

function finalize(
  tier: 1 | 2 | 3 | 4,
  score: number,
  flags: TriageResult["triage_flags"],
  actions: string[],
): TriageResult {
  const boundedScore = Math.min(100, Math.max(0, Math.round(score)));
  const tierFloor = tier === 4 ? 90 : tier === 3 ? 60 : tier === 2 ? 35 : 0;
  const triage_score = Math.max(boundedScore, tierFloor);

  return {
    rules_version: TRIAGE_RULES_VERSION,
    triage_tier: tier,
    triage_score,
    triage_flags: flags,
    recommended_actions: [...new Set(actions)],
  };
}
