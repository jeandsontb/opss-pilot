import { pipeline } from "@huggingface/transformers";

export const EMBEDDING_MODEL = "all-MiniLM-L6-v2";

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

type FeatureExtractor = (
  text: string,
  options: { pooling: "mean"; normalize: true },
) => Promise<{ data: Float32Array | number[] }>;

let extractorPromise: Promise<FeatureExtractor> | undefined;

async function getExtractor(): Promise<FeatureExtractor> {
  extractorPromise ??= pipeline("feature-extraction", EMBEDDING_MODEL, {
    local_files_only: true,
  }) as unknown as Promise<FeatureExtractor>;
  return extractorPromise;
}

function normalize(values: ArrayLike<number>): number[] {
  let squaredNorm = 0;
  for (let index = 0; index < values.length; index += 1) {
    squaredNorm += values[index] ** 2;
  }
  const norm = Math.sqrt(squaredNorm);
  if (!Number.isFinite(norm) || norm === 0) throw new Error("Embedding model returned a zero vector");
  return Array.from({ length: values.length }, (_, index) => values[index] / norm);
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    if (text.trim().length === 0) throw new Error("Embedding text is required");
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return normalize(output.data);
  }
}

let singleton: LocalEmbeddingProvider | undefined;

export function getEmbeddingProvider(): EmbeddingProvider {
  singleton ??= new LocalEmbeddingProvider();
  return singleton;
}

export function resetEmbeddingProviderForTests(): void {
  singleton = undefined;
  extractorPromise = undefined;
}
