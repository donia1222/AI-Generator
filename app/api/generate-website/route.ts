import { NextRequest, NextResponse } from "next/server";
import { CREATOR_SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT } from "@/lib/prompts";
import { ModificationAnalyzer, ModificationIntent } from "@/lib/modification-analyzer";
import { HTMLSectionDetector } from "@/lib/html-section-detector";
import { HTMLMerger } from "@/lib/html-merger";
import { INCREMENTAL_MODIFY_SYSTEM_PROMPT, CROSS_SECTION_MODIFY_SYSTEM_PROMPT } from "@/lib/prompts-incremental";

export const maxDuration = 300;

// Models that use /v1/responses instead of /v1/chat/completions
const RESPONSES_API_MODELS = ["gpt-5.1-codex-mini", "gpt-5.2"];

async function generateWithOpenAI(systemPrompt: string, userMessage: string, primaryModel = "gpt-5.1-codex-mini") {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const fallbacks = ["gpt-4o", "gpt-4.1-mini", "gpt-3.5-turbo"].filter(m => m !== primaryModel);
  const models = [primaryModel, ...fallbacks];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      console.log(`🔄 Trying OpenAI model: ${model}`);

      let content: string;

      if (RESPONSES_API_MODELS.includes(model)) {
        // Use /v1/responses endpoint
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model,
            instructions: systemPrompt,
            input: userMessage,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`❌ ${model} failed:`, JSON.stringify(error, null, 2));
          lastError = new Error(`${model}: ${error.error?.message || response.statusText}`);
          continue;
        }

        const data = await response.json();
        const messageItem = data.output?.find((item: { type: string }) => item.type === "message");
        content = messageItem?.content?.find((c: { type: string }) => c.type === "output_text")?.text
          ?? data.output_text;

        if (!content) {
          console.error(`❌ ${model} returned empty content, response:`, JSON.stringify(data).substring(0, 300));
          lastError = new Error(`${model}: empty content in response`);
          continue;
        }

      } else {
        // Use /v1/chat/completions endpoint
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`❌ ${model} failed:`, JSON.stringify(error, null, 2));
          lastError = new Error(`${model}: ${error.error?.message || response.statusText}`);
          continue;
        }

        const data = await response.json();
        content = data.choices[0].message.content;
      }

      console.log(`✅ Successfully used OpenAI model: ${model}`);
      console.log(`📄 Response length: ${content?.length || 0} characters`);
      console.log(`📄 Response preview:`, content?.substring(0, 300));
      return content;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ ${model} exception:`, error);
      continue;
    }
  }

  throw lastError || new Error("All OpenAI models failed");
}

async function generateWithGemini(systemPrompt: string, userMessage: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Use Gemini 2.5 Flash (current model in 2026, fast and good quality)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + "\n\n" + userMessage }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384, // Increased for full page modifications
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No text in Gemini response");
  }

  console.log(`📄 Gemini response length: ${text.length} characters`);
  console.log(`📄 Gemini response preview:`, text.substring(0, 300));

  return text;
}

async function generateWithGeminiChat(systemPrompt: string, userMessage: string, geminiModel = "gemini-2.5-pro-preview-05-06") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: geminiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini Chat API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in Gemini Chat response");

  console.log(`📄 Gemini Chat (${geminiModel}) response length: ${content.length} characters`);
  return content;
}

async function handleIncrementalModification(
  currentHTML: string,
  userPrompt: string,
  intent: ModificationIntent,
  model = "gpt-5.1-codex-mini"
): Promise<NextResponse | null> {
  try {
    const results = [];

    for (const sectionName of intent.targetSections) {
      // 1. Extract section
      const section = HTMLSectionDetector.extractSection(currentHTML, sectionName);
      if (!section) {
        console.warn(`⚠️ Section ${sectionName} not found - falling back to full regeneration`);
        return null; // Activate fallback
      }

      console.log(`✂️ Extracted section: ${sectionName} (${section.content.length} chars)`);

      // 2. Build focused prompt
      const prompt = `CURRENT ${section.name.toUpperCase()} SECTION:\n${section.content}\n\nUSER REQUEST: ${userPrompt}\n\nReturn ONLY the modified section.`;

      // 3. Call AI using selected model
      let modified: string;
      try {
        if (model === "gemini") {
          modified = await generateWithGemini(INCREMENTAL_MODIFY_SYSTEM_PROMPT, prompt);
        } else if (model === "gemini-3-pro") {
          modified = await generateWithGeminiChat(INCREMENTAL_MODIFY_SYSTEM_PROMPT, prompt, "gemini-2.5-pro-preview-05-06");
        } else {
          modified = await generateWithOpenAI(INCREMENTAL_MODIFY_SYSTEM_PROMPT, prompt, model);
        }
      } catch (error) {
        console.error(`❌ AI call failed for section ${sectionName}:`, error);
        return null; // Activate fallback
      }

      // 4. Extract HTML from markdown code fences if present
      const fenceMatch = modified.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
      if (fenceMatch) {
        console.log('📝 Extracted section from markdown code fence');
        modified = fenceMatch[1].trim();
      }

      // 5. Extract section from response (in case AI returns full HTML)
      modified = HTMLMerger.extractSectionFromResponse(modified, sectionName);

      results.push({ section, newContent: modified });
    }

    // 6. Merge
    const mergedHTML = HTMLMerger.replaceSections(currentHTML, results);

    // 7. Validate
    const validation = HTMLMerger.validate(mergedHTML);
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.errors);
      return null; // Activate fallback
    }

    console.log(`✅ Incremental modification successful for sections: ${intent.targetSections.join(', ')}`);

    return NextResponse.json({
      status: 'success',
      botReply: mergedHTML,
      metadata: { strategy: 'incremental', sectionsModified: intent.targetSections }
    });

  } catch (error) {
    console.error('❌ Incremental modification failed:', error);
    return null; // Activate fallback
  }
}

async function handleCrossSectionModification(
  currentHTML: string,
  userPrompt: string,
  intent: ModificationIntent,
  model = "gpt-5.1-codex-mini"
): Promise<NextResponse | null> {
  try {
    console.log('🔀 Using cross-section modification strategy');

    // Use cross-section prompt with full HTML
    const prompt = `CURRENT PAGE:\n${currentHTML}\n\nUSER REQUEST: ${userPrompt}\n\nReturn the complete modified HTML.`;

    // Call AI using selected model
    let modified: string;
    try {
      if (model === "gemini") {
        modified = await generateWithGemini(CROSS_SECTION_MODIFY_SYSTEM_PROMPT, prompt);
      } else if (model === "gemini-3-pro") {
        modified = await generateWithGeminiChat(CROSS_SECTION_MODIFY_SYSTEM_PROMPT, prompt, "gemini-2.5-pro-preview-05-06");
      } else {
        modified = await generateWithOpenAI(CROSS_SECTION_MODIFY_SYSTEM_PROMPT, prompt, model);
      }
    } catch (error) {
      console.error('❌ AI call failed for cross-section:', error);
      return null; // Activate fallback
    }

    // Extract HTML from markdown code fences if present
    const fenceMatch = modified.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
      console.log('📝 Extracted HTML from markdown code fence');
      modified = fenceMatch[1].trim();
    }

    // Check if response is too short (likely truncated)
    if (modified.length < currentHTML.length * 0.5) {
      console.error('❌ Response too short (likely truncated)', {
        original: currentHTML.length,
        response: modified.length
      });
      return null; // Activate fallback
    }

    // Validate
    const validation = HTMLMerger.validate(modified);
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.errors);
      console.error('❌ Response preview:', modified.substring(0, 200) + '...');
      return null; // Activate fallback
    }

    console.log('✅ Cross-section modification successful');

    return NextResponse.json({
      status: 'success',
      botReply: modified,
      metadata: { strategy: 'cross-section', affectsGlobal: intent.affectsGlobal }
    });

  } catch (error) {
    console.error('❌ Cross-section modification failed:', error);
    return null; // Activate fallback
  }
}

export async function POST(req: NextRequest) {
  const { userMessage, isModify, currentHTML, model = "gpt-5.1-codex-mini" } = await req.json();

  // NEW: Incremental editing logic for modifications
  if (isModify && currentHTML) {
    // Analyze modification intent
    const intent = ModificationAnalyzer.analyze(userMessage);
    console.log(`📊 Modification strategy: ${intent.strategy}`, {
      targetSections: intent.targetSections,
      affectsGlobal: intent.affectsGlobal,
      reasoning: intent.reasoning
    });

    // Try incremental modification (1-2 specific sections)
    if (intent.strategy === 'incremental' && intent.targetSections.length <= 2) {
      const result = await handleIncrementalModification(currentHTML, userMessage, intent, model);
      if (result) return result; // Success - return early
      console.log('⚠️ Incremental modification failed, falling back to full regeneration');
    }

    // Try cross-section modification (global changes or 3+ sections)
    if (intent.strategy === 'cross-section') {
      const result = await handleCrossSectionModification(currentHTML, userMessage, intent, model);
      if (result) return result; // Success - return early
      console.log('⚠️ Cross-section modification failed, falling back to full regeneration');
    }

    // If incremental/cross-section failed or strategy is full-regen, continue to full regeneration below
    console.log('🔄 Using full regeneration strategy');
  }

  const systemPrompt = isModify ? MODIFY_SYSTEM_PROMPT : CREATOR_SYSTEM_PROMPT;

  // For full regeneration on modify, include the current HTML in the user message
  const finalUserMessage = (isModify && currentHTML)
    ? `Here is the current HTML of the website:\n\n${currentHTML}\n\nThe user wants this change: ${userMessage}\n\nReturn the COMPLETE modified HTML preserving ALL existing inline styles, classes, and structure. Only change what the user asked for.`
    : userMessage;

  console.log(`🔄 Trying model: ${model}`);

  type GenerateFn = () => Promise<string>;

  const generators: Record<string, GenerateFn> = {
    "gpt-5.1-codex-mini": () => generateWithOpenAI(systemPrompt, finalUserMessage, "gpt-5.1-codex-mini"),
    "gpt-4o":             () => generateWithOpenAI(systemPrompt, finalUserMessage, "gpt-4o"),
    "gemini-3-pro":       () => generateWithGeminiChat(systemPrompt, finalUserMessage, "gemini-2.5-pro-preview-05-06"),
    "gemini":             () => generateWithGemini(systemPrompt, finalUserMessage),
  };

  const fallbackOrder: string[] = ["gpt-5.1-codex-mini", "gpt-4o", "gemini-3-pro", "gemini"];
  const tryOrder = [model, ...fallbackOrder.filter(m => m !== model)];

  for (const m of tryOrder) {
    const fn = generators[m];
    if (!fn) continue;
    try {
      const result = await fn();
      console.log(`✅ ${m} succeeded! Length: ${result.length}`);
      return NextResponse.json({ status: "success", botReply: result });
    } catch (err) {
      console.error(`❌ ${m} failed:`, err);
    }
  }

  return NextResponse.json({ status: "error", message: "Kein KI-Dienst verfügbar." }, { status: 503 });
}
