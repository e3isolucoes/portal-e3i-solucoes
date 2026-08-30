export interface ChunkingConfig {
  targetSize: number;
  maxSize: number;
  overlap: number;
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  targetSize: 500,
  maxSize: 1000,
  overlap: 50,
};

export function getChunkingConfig(): ChunkingConfig {
  return {
    targetSize: process.env.KNOWLEDGE_CHUNK_TARGET_SIZE ? parseInt(process.env.KNOWLEDGE_CHUNK_TARGET_SIZE, 10) : 500,
    maxSize: process.env.KNOWLEDGE_CHUNK_MAX_SIZE ? parseInt(process.env.KNOWLEDGE_CHUNK_MAX_SIZE, 10) : 1000,
    overlap: process.env.KNOWLEDGE_CHUNK_OVERLAP ? parseInt(process.env.KNOWLEDGE_CHUNK_OVERLAP, 10) : 50,
  };
}
