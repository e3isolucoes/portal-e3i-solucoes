import * as fs from 'fs';
import * as path from 'path';

export interface GoldenCase {
  id: string;
  organizationId: string;
  query: string;
  relevantChunkIds: string[];
  forbiddenChunkIds: string[];
  noAnswer: boolean;
  category: string;
  sourceTypes: string[];
}

export interface GoldenDataset {
  datasetId: string;
  version: string;
  createdAt: string;
  cases: GoldenCase[];
}

export class GoldenDatasetLoader {
  public static loadDataset(filePath?: string): GoldenDataset {
    const fullPath = filePath || path.resolve(process.cwd(), 'tests/evals/retrieval/golden.v1.json');
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw) as GoldenDataset;
  }
}
