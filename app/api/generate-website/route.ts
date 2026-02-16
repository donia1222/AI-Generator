import { NextRequest, NextResponse } from "next/server";
import { CREATOR_SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT } from "@/lib/prompts";
import { ModificationAnalyzer, ModificationIntent } from "@/lib/modification-analyzer";
import { HTMLSectionDetector } from "@/lib/html-section-detector";
import { HTMLMerger } from "@/lib/html-merger";
import { INCREMENTAL_MODIFY_SYSTEM_PROMPT, CROSS_SECTION_MODIFY_SYSTEM_PROMPT } from "@/lib/prompts-incremental";

export const maxDuration = 60;

async function generateWithOpenAI(systemPrompt: string, userMessage: string) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Try models that should be available if you have access to Sora
  const models = [
    "chatgpt-4o-latest",   // Alias to the latest GPT-4o (should work if Sora works)
    "gpt-4-turbo",         // GPT-4 Turbo (older but widely available)
    "gpt-4.1-nano",        // Cheapest GPT-4.1 (try if available)
    "gpt-4.1-mini",        // Good balance of cost/quality
    "gpt-3.5-turbo"        // Last resort (weak but always works)
  ];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      console.log(`🔄 Trying OpenAI model: ${model}`);

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
        continue; // Try next model
      }

      const data = await response.json();
      console.log(`✅ Successfully used OpenAI model: ${model}`);
      return data.choices[0].message.content;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ ${model} exception:`, error);
      continue; // Try next model
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

  return text;
}

async function handleIncrementalModification(
  currentHTML: string,
  userPrompt: string,
  intent: ModificationIntent
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

      // 3. Call AI (try Gemini first, fallback to OpenAI)
      let modified: string;
      try {
        if (process.env.GEMINI_API_KEY) {
          modified = await generateWithGemini(INCREMENTAL_MODIFY_SYSTEM_PROMPT, prompt);
        } else {
          modified = await generateWithOpenAI(INCREMENTAL_MODIFY_SYSTEM_PROMPT, prompt);
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
  intent: ModificationIntent
): Promise<NextResponse | null> {
  try {
    console.log('🔀 Using cross-section modification strategy');

    // Use cross-section prompt with full HTML
    const prompt = `CURRENT PAGE:\n${currentHTML}\n\nUSER REQUEST: ${userPrompt}\n\nReturn the complete modified HTML.`;

    // Call AI
    let modified: string;
    try {
      if (process.env.GEMINI_API_KEY) {
        modified = await generateWithGemini(CROSS_SECTION_MODIFY_SYSTEM_PROMPT, prompt);
      } else {
        modified = await generateWithOpenAI(CROSS_SECTION_MODIFY_SYSTEM_PROMPT, prompt);
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
  const { userMessage, isModify, currentHTML } = await req.json();

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
      const result = await handleIncrementalModification(currentHTML, userMessage, intent);
      if (result) return result; // Success - return early
      console.log('⚠️ Incremental modification failed, falling back to full regeneration');
    }

    // Try cross-section modification (global changes or 3+ sections)
    if (intent.strategy === 'cross-section') {
      const result = await handleCrossSectionModification(currentHTML, userMessage, intent);
      if (result) return result; // Success - return early
      console.log('⚠️ Cross-section modification failed, falling back to full regeneration');
    }

    // If incremental/cross-section failed or strategy is full-regen, continue to full regeneration below
    console.log('🔄 Using full regeneration strategy');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const systemPrompt = isModify ? MODIFY_SYSTEM_PROMPT : CREATOR_SYSTEM_PROMPT;

  // Try Gemini first if configured
  if (geminiApiKey) {
    try {
      console.log("🔄 Trying Gemini Pro...");
      const geminiResponse = await generateWithGemini(systemPrompt, userMessage);
      console.log("✅ Gemini Pro succeeded!");

      return NextResponse.json({
        status: "success",
        botReply: geminiResponse,
      });

    } catch (error) {
      console.error("❌ Gemini error:", error);
      console.log("⚠️ Gemini failed - Falling back to OpenAI...");

      // Fallback to OpenAI
      try {
        const openaiResponse = await generateWithOpenAI(systemPrompt, userMessage);
        return NextResponse.json({
          status: "success",
          botReply: openaiResponse,
        });
      } catch (openaiError) {
        console.error("OpenAI fallback also failed:", openaiError);
        return NextResponse.json(
          { status: "error", message: "Gemini und OpenAI sind nicht verfügbar. Bitte versuche es später erneut." },
          { status: 503 }
        );
      }
    }
  }

  // If Gemini is not configured, use OpenAI directly
  console.log("⚠️ Gemini API key not configured - Using OpenAI...");
  try {
    const openaiResponse = await generateWithOpenAI(systemPrompt, userMessage);
    return NextResponse.json({
      status: "success",
      botReply: openaiResponse,
    });
  } catch (openaiError) {
    console.error("OpenAI error:", openaiError);
    return NextResponse.json(
      { status: "error", message: "Kein KI-Dienst verfügbar. Bitte GEMINI_API_KEY oder OPENAI_API_KEY konfigurieren." },
      { status: 500 }
    );
  }
}
