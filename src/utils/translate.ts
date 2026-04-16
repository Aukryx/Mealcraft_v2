const MAX_CHARS = 450; // Limite sécurisée de MyMemory

/**
 * Découpe un texte long en morceaux respectant la limite de caractères,
 * en coupant sur des frontières de phrases autant que possible.
 */
const chunkText = (text: string): string[] => {
  if (text.length <= MAX_CHARS) return [text];

  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > MAX_CHARS) {
      // Phrase trop longue : découpe brutale par mots
      if (current) { chunks.push(current.trim()); current = ''; }
      const words = sentence.split(' ');
      let sub = '';
      for (const word of words) {
        if ((sub + ' ' + word).trim().length > MAX_CHARS) {
          chunks.push(sub.trim());
          sub = word;
        } else {
          sub = (sub + ' ' + word).trim();
        }
      }
      if (sub) chunks.push(sub.trim());
    } else if ((current + sentence).length > MAX_CHARS) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

/**
 * Traduit un texte via MyMemory (gratuit, sans clé API).
 * Retourne le texte original en cas d'échec.
 */
export const translateText = async (
  text: string,
  from = 'en',
  to = 'fr'
): Promise<string> => {
  if (!text?.trim()) return text;
  // Inutile de traduire si déjà dans la langue cible
  if (from === to) return text;

  try {
    const chunks = chunkText(text);
    const translated: string[] = [];

    for (const chunk of chunks) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${from}|${to}`;
      const response = await fetch(url);
      if (!response.ok) {
        translated.push(chunk);
        continue;
      }
      const data = await response.json();
      if (data.responseStatus === 200) {
        translated.push(data.responseData.translatedText);
      } else {
        translated.push(chunk); // fallback sur l'original
      }
    }

    return translated.join(' ');
  } catch {
    return text; // Toujours fonctionnel même sans traduction
  }
};

/**
 * Traduit un tableau de textes en parallèle.
 */
export const translateBatch = async (
  texts: string[],
  from = 'en',
  to = 'fr'
): Promise<string[]> => {
  return Promise.all(texts.map((t) => translateText(t, from, to)));
};
