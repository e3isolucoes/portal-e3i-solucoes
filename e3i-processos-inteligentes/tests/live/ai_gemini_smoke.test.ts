import { describe, it, expect } from 'vitest';
import { GeminiProvider } from '../../src/ai/models/GeminiProvider';
import { DiscoveryBusinessContextSchema } from '../../src/ai/schemas/DiscoveryBusinessContextSchema';
import { AIConfig } from '../../src/ai/config/AIConfig';

const isLiveTest = process.env.AI_LIVE_TESTS === 'true' && !!process.env.GEMINI_API_KEY;

describe.skipIf(!isLiveTest)('Live Gemini Provider Smoke Test (Guarded)', () => {
  it('should execute live model call and extract structured JSON with real token metrics', async () => {
    const provider = new GeminiProvider();
    const model = AIConfig.models.fast || 'gemini-2.5-flash';

    const result = await provider.generate({
      model,
      systemInstructions: 'Extraia somente informações explicitamente presentes no texto.',
      userContent: JSON.stringify({
        input: { text: 'A empresa fabrica autopeças para montadoras e gerencia estoque com planilhas Excel.' },
        contextSections: []
      }),
      responseSchema: DiscoveryBusinessContextSchema,
    });

    expect(result.provider).toBe('gemini');
    expect(result.data).toBeDefined();
    const parsed = DiscoveryBusinessContextSchema.parse(result.data);
    expect(parsed.manualControls).toBeDefined();

    // Verify real usage
    expect(result.usage).toBeDefined();
    expect(typeof result.usage.inputTokens === 'number' || result.usage.inputTokens === null).toBe(true);
    expect(typeof result.usage.outputTokens === 'number' || result.usage.outputTokens === null).toBe(true);
  });
});
