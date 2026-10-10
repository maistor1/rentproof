import type Anthropic from "@anthropic-ai/sdk";
import { SLOTS } from "@/lib/types";

// JSON Schema for SlotReport in src/lib/types.ts. Keep the two in sync.
//
// Sonnet 5.5 returns a 400 on forced tool_choice ("any" / "tool"), so call
// with tool_choice "auto". `strict: true` guarantees the input matches this
// schema when the tool is called; the system prompt tells the model to call it.
export const REPORT_DAMAGE_TOOL = {
  name: "report_damage",
  description:
    "Report new damage found by comparing the BEFORE and AFTER photo of one slot.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      slot: { type: "string", enum: [...SLOTS] },
      image_quality_ok: { type: "boolean" },
      retake_reason: { type: ["string", "null"] },
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "scratch",
                "dent",
                "crack",
                "bent_or_broken",
                "missing_part",
                "leak",
                "glass_or_light",
                "other",
              ],
            },
            location: { type: "string" },
            severity: { type: "string", enum: ["minor", "moderate", "severe"] },
            confidence: { type: "number" },
            box: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    w: { type: "number" },
                    h: { type: "number" },
                  },
                  required: ["x", "y", "w", "h"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            evidence: { type: "string" },
          },
          required: ["type", "location", "severity", "confidence", "box", "evidence"],
          additionalProperties: false,
        },
      },
      ignored_changes: { type: "array", items: { type: "string" } },
    },
    required: ["slot", "image_quality_ok", "retake_reason", "findings", "ignored_changes"],
    additionalProperties: false,
  },
} satisfies Anthropic.Tool;
