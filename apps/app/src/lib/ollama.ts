/**
 * DomoLens Ollama Local LLM Integration Client
 * Provides connection discovery, model inspection, structured tool-calling,
 * and conversational video editing via local Ollama instances.
 */

export const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434";

/**
 * Models verified to have strong instruction following, tool execution,
 * and structured JSON generation capabilities suitable for DomoLens video editing.
 */
export interface CapableModelSpec {
  name: string;
  displayName: string;
  sizeDesc: string;
  recommended: boolean;
  description: string;
}

export const CAPABLE_OLLAMA_MODELS: CapableModelSpec[] = [
  {
    name: "llama3.2:latest",
    displayName: "Llama 3.2 (3.2B)",
    sizeDesc: "2.0 GB",
    recommended: true,
    description: "Meta's flagship compact model. Fast, lightweight, and excels at JSON tool execution.",
  },
  {
    name: "qwen2.5-coder:7b",
    displayName: "Qwen 2.5 Coder (7B)",
    sizeDesc: "4.7 GB",
    recommended: true,
    description: "Alibaba's code-specialized model. High-precision parameter extraction and tool dispatch.",
  },
  {
    name: "qwen2.5:7b",
    displayName: "Qwen 2.5 (7B)",
    sizeDesc: "4.7 GB",
    recommended: false,
    description: "Balanced reasoning with excellent multi-step structured output.",
  },
  {
    name: "gemma4:latest",
    displayName: "Gemma 4 (8B)",
    sizeDesc: "9.6 GB",
    recommended: false,
    description: "Deep instruction-following with extended thinking capability.",
  },
  {
    name: "gemma3:4b",
    displayName: "Gemma 3 (4B)",
    sizeDesc: "3.3 GB",
    recommended: false,
    description: "Google's balanced local model with strong natural language quality.",
  },
  {
    name: "gemma2:2b",
    displayName: "Gemma 2 (2B)",
    sizeDesc: "1.6 GB",
    recommended: false,
    description: "Ultra-compact model for lower-spec machines.",
  },
  {
    name: "mistral:7b",
    displayName: "Mistral (7B)",
    sizeDesc: "4.1 GB",
    recommended: false,
    description: "Classic open-weights model with reliable creative recommendations.",
  },
  {
    name: "llama3.1:8b",
    displayName: "Llama 3.1 (8B)",
    sizeDesc: "4.9 GB",
    recommended: false,
    description: "State-of-the-art 8B reasoning for detailed video design critiques.",
  },
];

export interface OllamaTagItem {
  name: string;
  model: string;
  size: number;
  details?: {
    family?: string;
    parameter_size?: string;
  };
  capabilities?: string[];
}

export interface OllamaConnectionResult {
  connected: boolean;
  endpoint: string;
  models: string[];
  recommendedModel: string | null;
  error?: string;
}

/**
 * Check if the local Ollama server is responding and list installed models.
 */
export async function checkOllamaConnection(
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
): Promise<OllamaConnectionResult> {
  const cleanEndpoint = endpoint.replace(/\/+$/, "");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${cleanEndpoint}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        connected: false,
        endpoint: cleanEndpoint,
        models: [],
        recommendedModel: null,
        error: `Ollama returned HTTP status ${res.status}`,
      };
    }

    const data = (await res.json()) as { models?: OllamaTagItem[] };
    const rawModels = data.models || [];
    const modelNames = rawModels.map((m) => m.name || m.model).filter(Boolean);

    // Pick best available model from installed models
    let bestModel: string | null = null;
    const priority = [
      "llama3.2:latest",
      "llama3.2",
      "qwen2.5-coder:7b",
      "qwen2.5:7b",
      "gemma4:latest",
      "gemma3:4b",
      "llama3.1:8b",
      "mistral:7b",
      "gemma2:2b",
      "qwen2.5:0.5b",
    ];

    for (const p of priority) {
      const match = modelNames.find((m) => m.toLowerCase().startsWith(p.toLowerCase()));
      if (match) {
        bestModel = match;
        break;
      }
    }

    if (!bestModel && modelNames.length > 0) {
      bestModel = modelNames[0] ?? null;
    }

    return {
      connected: true,
      endpoint: cleanEndpoint,
      models: modelNames,
      recommendedModel: bestModel,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      endpoint: cleanEndpoint,
      models: [],
      recommendedModel: null,
      error: msg,
    };
  }
}

export interface OllamaActionPayload {
  actionKey: string;
  label: string;
}

export interface OllamaQuestionOption {
  label: string;
  value: string;
}

export interface OllamaQuestionPayload {
  id: string;
  prompt: string;
  options: OllamaQuestionOption[];
}

export interface OllamaParsedResponse {
  message: string;
  actions?: OllamaActionPayload[];
  questions?: OllamaQuestionPayload[];
}

/**
 * Execute chat request with Ollama using structured JSON output format.
 */
export async function queryOllamaDirector(params: {
  endpoint?: string;
  model: string;
  userPrompt: string;
  projectSummary: Record<string, unknown>;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<OllamaParsedResponse> {
  const endpoint = (params.endpoint || DEFAULT_OLLAMA_ENDPOINT).replace(/\/+$/, "");

  const systemInstructions = `You are the DomoLens AI Director, an expert video editor and marketing cinematographer.
Your goal is to inspect the user's recorded desktop video, describe what is in it, validate what kind of app it is, recommend aesthetic and cinematic enhancements, and execute video edits.

CURRENT VIDEO STATE & TELEMETRY:
${JSON.stringify(params.projectSummary, null, 2)}

AVAILABLE VIDEO EDIT ACTIONS (use only these actionKey values in actions array):
- "apply_rec_tilt": Apply +12° pitch / -10° yaw 3D frame tilt for Keynote perspective depth.
- "reset_tilt": Reset 3D frame tilt to 0° (flat direct view).
- "apply_rec_backdrop": Set canvas background to Studio Obsidian (deep gradient).
- "apply_backdrop_indigo": Set background to Indigo Dusk gradient.
- "apply_backdrop_sunset": Set background to Sunset Amber gradient.
- "apply_backdrop_white": Set background to Studio Clean White.
- "apply_backdrop_emerald": Set background to Emerald Studio gradient.
- "apply_frame_terminal": Switch window frame to macOS Terminal style with traffic lights.
- "apply_frame_macos": Switch window frame to classic macOS window style.
- "apply_frame_none": Remove window frame (frameless).
- "apply_cursor_laser": Set cursor to Ruby Neon Laser Dot.
- "apply_cursor_obsidian": Set cursor to Obsidian Glow.
- "apply_cursor_macos": Set cursor to macOS Arrow.
- "apply_cursor_scale_up": Scale cursor size to 1.8x for high social visibility.
- "apply_rec_sfx": Enable tactile click bops, typing bursts, and music ducking.
- "mute_sfx": Disable acoustic sound effects.
- "plot_zooms": Auto-plot camera zoom keyframes on recorded clicks and interactions.
- "clear_zooms": Clear all camera zooms (full-frame 1.0x).
- "tour_shift": Create a Camera Shift Tour gliding smoothly across hotspots.
- "add_subtitle": Insert a compact glass subtitle card at the playhead.
- "apply_developer_style": Combined preset: Terminal frame + Obsidian backdrop + Neon cursor + Mechanical SFX.
- "apply_saas_style": Combined preset: 3D tilt + Indigo backdrop + macOS frame + Click bops.

CRITICAL INSTRUCTIONS:
1. ALWAYS return valid JSON matching this schema:
{
  "thought": "brief internal chain of thought",
  "message": "Polished, well-formatted markdown response. Do NOT use raw asterisks or unformatted text. Use clean bullet points with • and concise bold labels.",
  "actions": [
    { "actionKey": "action_name_from_list_above", "label": "Short Action Button Label" }
  ],
  "questions": [
    {
      "id": "question_identifier",
      "prompt": "Question text to validate app type or goals",
      "options": [
        { "label": "Button Label", "value": "app_type:cli" }
      ]
    }
  ]
}
2. When the user asks to edit the video (tilt, background, cursor, frame, zooms, subtitles, sounds), include the appropriate action in the "actions" array and confirm what you changed.
3. When the user asks for recommendations or what their app is:
   - Identify what the app appears to be based on telemetry (window frame, clicks, typing).
   - In "questions", ask validating questions so the user can confirm their app category or audience.
   - Provide concrete recommendations for pacing, framing, and audio.`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemInstructions },
  ];

  if (params.conversationHistory && params.conversationHistory.length > 0) {
    // Include last 4 turns for context
    const recent = params.conversationHistory.slice(-4);
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: params.userPrompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  const res = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: params.model,
      messages,
      format: "json",
      stream: false,
      options: {
        temperature: 0.4,
      },
    }),
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Ollama request failed with HTTP status ${res.status}`);
  }

  const result = (await res.json()) as { message?: { content?: string } };
  const rawContent = result.message?.content || "";

  try {
    const parsed = JSON.parse(rawContent) as {
      message?: string;
      actions?: OllamaActionPayload[];
      questions?: OllamaQuestionPayload[];
    };

    return {
      message: parsed.message || rawContent,
      actions: Array.isArray(parsed.actions) ? parsed.actions : undefined,
      questions: Array.isArray(parsed.questions) ? parsed.questions : undefined,
    };
  } catch {
    // If model returned text that wasn't strict JSON, return text cleanly
    return {
      message: rawContent.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim(),
    };
  }
}
