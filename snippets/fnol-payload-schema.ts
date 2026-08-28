// Illustrates the "typed field, validation, audit log" design principle from
// the README: every FNOL submission is validated against a Zod schema before
// it ever leaves the domain layer, so a malformed record can't reach the
// claims backend. Trimmed to the schema definition — the full file also
// contains the builder function that assembles and parses this shape.

import { z } from "zod";
import {
  FNOL_PAYLOAD_VERSION,
  type FnolAttachment,
  type FnolAuditEntry,
  type FnolBuildInput,
} from "./fnol-payload-input";

const triageFlagSchema = z.object({
  code: z.string(),
  label: z.string(),
});

export const fnolPayloadSchema = z.object({
  fnol_version: z.literal(FNOL_PAYLOAD_VERSION),
  incident_id: z.string().uuid(),
  submitted_at: z.string(),
  triage_tier: z.number().int().min(1).max(4).nullable(),
  triage_score: z.number().int().min(0).max(100).nullable(),
  incident: z.object({
    injury_date: z.string().nullable(),
    injury_time: z.string().nullable(),
    injury_reported_at: z.string().nullable(),
    description: z.string().nullable(),
    location_name: z.string().nullable(),
    mechanism: z.string().nullable(),
    equipment_involved: z.string().nullable(),
    witnesses: z.unknown(),
    immediate_action_taken: z.string().nullable(),
    body_parts_affected: z.array(z.string()),
    injury_type: z.string().nullable(),
    pain_scale: z.number().nullable(),
    medical_treatment: z.string().nullable(),
    treating_provider_name: z.string().nullable(),
    lost_time_indicator: z.boolean().nullable(),
    last_day_worked: z.string().nullable(),
    work_related_confirmed: z.boolean().nullable(),
  }),
  injured_worker: z.object({
    employee_number: z.string().nullable(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    job_title: z.string().nullable(),
    department: z.string().nullable(),
    phone_number: z.string().nullable(),
    email: z.string().nullable(),
    state_of_employment: z.string().nullable(),
  }),
  employer: z.object({
    name: z.string().nullable(),
    fein: z.string().nullable(),
  }),
  policy: z.object({
    carrier_name: z.string().nullable(),
    policy_number: z.string().nullable(),
    effective_date: z.string().nullable(),
    expiration_date: z.string().nullable(),
  }),
  supervisor_report: z.object({
    supervisor_name: z.string().nullable(),
    present_at_incident: z.boolean().nullable(),
    observation: z.string().nullable(),
    safety_procedure_followed: z.string().nullable(),
    corrective_action_taken: z.string().nullable(),
    lost_time_confirmed: z.boolean().nullable(),
  }),
  triage: z.object({
    tier: z.number().int().min(1).max(4).nullable(),
    score: z.number().int().min(0).max(100).nullable(),
    flags: z.array(triageFlagSchema),
    recommended_actions: z.array(z.string()),
  }),
});
