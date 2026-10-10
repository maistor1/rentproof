import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Slot, SlotReport } from "@/lib/types";
import { SYSTEM_PROMPT } from "./prompt";
import { REPORT_DAMAGE_TOOL } from "./reportDamageTool";

export const VISION_MODEL = "claude-sonnet-5-5";

const client = new Anthropic();

function jpeg(data: Buffer): Anthropic.ImageBlockParam {
  return {
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: data.toString("base64") },
  };
}

// RP-6: one call per slot, BEFORE and AFTER images, returns the report_damage
// tool input. See README "Notes for the AI owner".
export async function compareSlot(
  slot: Slot,
  beforeJpeg: Buffer,
  afterJpeg: Buffer,
): Promise<SlotReport> {
  const content: Anthropic.ContentBlockParam[] = [
    jpeg(beforeJpeg),
    { type: "text", text: "BEFORE" },
    jpeg(afterJpeg),
    { type: "text", text: "AFTER" },
    { type: "text", text: `Slot: ${slot}` },
  ];

  // Forced tool_choice is a 400 on Sonnet 5.5, so use auto and retry once if
  // the model answers without calling the tool.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [REPORT_DAMAGE_TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error(`Model refused slot ${slot}: ${response.stop_details?.explanation ?? "no details"}`);
    }

    const call = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === REPORT_DAMAGE_TOOL.name,
    );
    if (call) return normalize(slot, call.input as SlotReport);
  }
  throw new Error(`No report_damage call for slot ${slot} after 2 attempts`);
}

// strict: true guarantees the shape; pin the slot to the one we asked about and
// keep numbers in range so the rules and the highlight drawing can trust them.
function normalize(slot: Slot, report: SlotReport): SlotReport {
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  return {
    ...report,
    slot,
    findings: report.findings.map((f) => ({
      ...f,
      confidence: clamp(f.confidence),
      box: f.box && { x: clamp(f.box.x), y: clamp(f.box.y), w: clamp(f.box.w), h: clamp(f.box.h) },
    })),
  };
}
