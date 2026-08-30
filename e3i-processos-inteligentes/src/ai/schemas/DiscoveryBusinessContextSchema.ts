import { z } from 'zod';

export const DiscoveryBusinessContextSchema = z.object({
  productsServices: z.array(z.string()),
  customerSegments: z.array(z.string()),
  mentionedSystems: z.array(z.string()),
  manualControls: z.array(z.string()),
});

export type DiscoveryBusinessContext = z.infer<typeof DiscoveryBusinessContextSchema>;
