import { PromptRegistry } from './PromptRegistry';
import { DiscoveryBusinessContextSchema } from '../schemas/DiscoveryBusinessContextSchema';
import { z } from 'zod';

export const globalPromptRegistry = new PromptRegistry();

globalPromptRegistry.register({
  id: 'discovery.extract-business-context',
  version: 1,
  purpose: 'Extração estruturada de contexto de negócios (produtos, segmentos, sistemas e controles manuais) a partir de texto livre do usuário.',
  status: 'ACTIVE',
  modelProfile: 'FAST',
  systemInstructions: `Você é um motor analítico e estritamente factual da E³I.
Extraia somente informações explicitamente presentes no texto fornecido pelo usuário.
Não complete lacunas.
Não deduza marcas, sistemas, clientes ou processos não mencionados.
Se a informação não existir, retorne array vazio.
Retorne estritamente um objeto JSON válido contendo exatamente as chaves: productsServices, customerSegments, mentionedSystems, manualControls.`,
  inputSchema: z.object({
    text: z.string().trim().min(1, 'O texto não pode estar vazio').max(5000, 'O texto excede o tamanho máximo permitido')
  }),
  outputSchema: DiscoveryBusinessContextSchema
});
