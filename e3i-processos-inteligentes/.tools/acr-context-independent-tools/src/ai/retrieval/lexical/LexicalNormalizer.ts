const DEFAULT_STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'por', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'com', 'sem',
  'e', 'ou', 'mas', 'que', 'se', 'como', 'quando', 'onde', 'porque',
  'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
  'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',
  'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa', 'teu', 'tua',
  'ser', 'estar', 'ter', 'haver', 'fazer', 'ir', 'vir',
  'mais', 'menos', 'muito', 'pouco', 'ja', 'nao', 'sim'
]);

// Business terms that must NEVER be treated as stopwords
const BUSINESS_PRESERVED_TERMS = new Set([
  'processo', 'processos', 'producao', 'produção', 'faturamento',
  'pedidos', 'cliente', 'clientes', 'planilha', 'sistema', 'vendas',
  'estoque', 'financeiro', 'contrato', 'nota', 'fiscal', 'custo'
]);

export class LexicalNormalizer {
  private stopwords: Set<string>;

  constructor(customStopwords?: string[]) {
    this.stopwords = customStopwords ? new Set(customStopwords) : DEFAULT_STOPWORDS;
  }

  public normalizeText(text: string, removeStopwords: boolean = true): string[] {
    if (!text || typeof text !== 'string') return [];

    // 1. Lowercase, Unicode NFC normalization and accent removal
    const lower = text.toLowerCase().normalize('NFC');
    
    // Also remove combining diacritics for normalization while preserving core words if desired,
    // or keep both normalized and raw. Let's normalize diacritics using NFD + regex replace
    const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 2. Remove punctuation (replace non-alphanumeric/spaces with space)
    const cleaned = normalized.replace(/[^\w\s]/g, ' ');

    // 3. Tokenize by whitespace
    const rawTokens = cleaned.split(/\s+/).map(t => t.trim()).filter(t => t.length > 1);

    // 4. Stopword filtering & deduplication
    const termSet = new Set<string>();
    for (const token of rawTokens) {
      if (BUSINESS_PRESERVED_TERMS.has(token)) {
        termSet.add(token);
        continue;
      }
      if (removeStopwords && this.stopwords.has(token)) {
        continue;
      }
      termSet.add(token);
    }

    return Array.from(termSet);
  }

  public normalizeQuery(query: string, maxTerms: number = 20): string[] {
    const terms = this.normalizeText(query, true);
    return terms.slice(0, maxTerms);
  }
}

export const globalLexicalNormalizer = new LexicalNormalizer();
