import type { ChatOpenAI } from "@langchain/openai";

export type EvaluationScores = {
  relevance: number;
  groundedness: number;
  clarity: number;
};

function clamp(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n))) : 0;
}

export async function evaluateAnswer(
  chatModel: ChatOpenAI,
  question: string,
  answer: string,
  context: string,
): Promise<EvaluationScores> {
  try {
    const trimmedContext = context.slice(0, 8_000);

    const prompt = [
      "You are an evaluation judge. Score the following AI-generated answer on three dimensions.",
      "",
      "Question:",
      question,
      "",
      "Answer:",
      answer,
      "",
      "Context retrieved from the transcript:",
      trimmedContext,
      "",
      "Score each dimension from 0 to 10:",
      "- relevance: Does the answer address the question asked? (0 = completely off-topic, 10 = perfectly addresses the question)",
      "- groundedness: Is the answer supported by the provided context? (0 = fabricated, 10 = fully grounded in context)",
      "- clarity: Is the answer clear, well-structured, and easy to understand? (0 = incomprehensible, 10 = perfectly clear)",
      "",
      'Respond ONLY with valid JSON in this exact format, no extra text:',
      '{"relevance": <number>, "groundedness": <number>, "clarity": <number>}',
    ].join("\n");

    const response = await chatModel.invoke([
      { role: "human", content: prompt },
    ]);

    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return { relevance: 0, groundedness: 0, clarity: 0 };

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    return {
      relevance: clamp(parsed.relevance),
      groundedness: clamp(parsed.groundedness),
      clarity: clamp(parsed.clarity),
    };
  } catch {
    return { relevance: 0, groundedness: 0, clarity: 0 };
  }
}
