import { aiDraftResultSchema, type AiDraftResult } from "../schemas/aiSchemas";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

// Builds the instruction we send to the local model. We ask for JSON only,
// with a strict shape, so the response is easy to validate and safe to
// drop straight into the create-bug form.
function buildPrompt(rawText: string): string {
  return `You are a QA engineer assistant. A teammate gave you a rough, unstructured bug description. Turn it into a structured bug report.

Rough description:
"""
${rawText}
"""

Respond with ONLY a JSON object (no markdown, no commentary) in exactly this shape:
{
  "title": "short, specific summary of the bug (max ~10 words)",
  "stepsToReproduce": ["step 1", "step 2", "..."],
  "expectedResult": "what should happen",
  "actualResult": "what actually happens",
  "severity": "low" | "medium" | "high" | "critical",
  "priority": "low" | "medium" | "high",
  "labels": ["short", "lowercase", "tags", "max 5"],
  "environment": {
    "device": "device mentioned, or empty string \"\" if none mentioned",
    "browser": "browser mentioned (e.g. Safari, Chrome), or empty string \"\" if none mentioned"
  }
}

Rules:
- Infer steps to reproduce even if the description is vague; make a reasonable best guess.
- severity reflects impact (does it block core functionality, crash, lose data?), priority reflects urgency.
- "environment.device" and "environment.browser" must always be present as strings — use "" (empty string) if not mentioned, never null and never omit the field.
- If a browser or device is mentioned in the text, put it in "environment" (e.g. browser: "Safari") — do NOT also repeat it as a label. Labels are for the kind of issue (e.g. "login", "crash", "regression"), not the browser/device.
- Keep labels short, lowercase, no spaces (use hyphens).
- Return ONLY the JSON object, nothing else.`;
}

// Calls the local Ollama server and asks it to draft a structured bug report
// from free-form text. Throws a friendly error if Ollama is unreachable, or
// if the model's output doesn't parse into our expected shape.
export async function draftBugReport(rawText: string): Promise<AiDraftResult> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(rawText),
        format: "json", // tells Ollama to constrain output to valid JSON
        stream: false,
        options: { temperature: 0.3 }, // lower = more consistent structure
      }),
    });
  } catch (err) {
    throw new Error(
      "Couldn't reach Ollama. Make sure it's running locally (brew services start ollama)."
    );
  }

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { response: string };

  let parsed: unknown;
  try {
    parsed = JSON.parse(data.response);
  } catch (err) {
    console.error("[aiService] Model did not return valid JSON:", data.response);
    throw new Error("AI returned output that wasn't valid JSON. Try again.");
  }

  const result = aiDraftResultSchema.safeParse(parsed);
  if (!result.success) {
    // Logged server-side (not sent to the client) so you can see exactly
    // what the model returned and which field(s) failed validation.
    console.error(
      "[aiService] Model JSON didn't match expected shape.\nRaw model output:",
      data.response,
      "\nValidation errors:",
      JSON.stringify(result.error.issues, null, 2)
    );
    throw new Error("AI response didn't match the expected bug report shape. Try again.");
  }

  return result.data;
}