const mockFetch = jest.fn();
global.fetch = mockFetch;

import { translateText, translateBatch } from '../utils/translate';

const mockOk = (translatedText: string) =>
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ responseStatus: 200, responseData: { translatedText } }),
  });

const mockFail = () =>
  mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

const mockNetworkError = () =>
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

beforeEach(() => mockFetch.mockClear());

describe('translateText', () => {
  it('retourne le texte original si vide', async () => {
    expect(await translateText('')).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retourne sans appel réseau si from === to', async () => {
    expect(await translateText('hello', 'en', 'en')).toBe('hello');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retourne la traduction en cas de succès', async () => {
    mockOk('Bonjour');
    expect(await translateText('Hello', 'en', 'fr')).toBe('Bonjour');
  });

  it('appelle MyMemory avec la bonne paire de langues', async () => {
    mockOk('Hola');
    await translateText('Hello', 'en', 'es');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('langpair=en|es');
    expect(url).toContain(encodeURIComponent('Hello'));
  });

  it('retourne le texte original si response.ok est false', async () => {
    mockFail();
    expect(await translateText('Hello', 'en', 'fr')).toBe('Hello');
  });

  it('retourne le texte original si responseStatus !== 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ responseStatus: 429, responseData: { translatedText: '' } }),
    });
    expect(await translateText('Hello', 'en', 'fr')).toBe('Hello');
  });

  it('retourne le texte original en cas d\'erreur réseau', async () => {
    mockNetworkError();
    expect(await translateText('Hello', 'en', 'fr')).toBe('Hello');
  });

  it('découpe un texte > 450 caractères en plusieurs appels fetch', async () => {
    // Deux phrases de ~300 chars chacune → doit générer 2 appels
    const sentence = 'This is a long sentence that repeats itself many times to fill up space. ';
    const longText = sentence.repeat(7); // ~504 chars
    mockOk('Phrase un.');
    mockOk('Phrase deux.');
    const result = await translateText(longText, 'en', 'fr');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toBe('Phrase un. Phrase deux.');
  });

  it('un texte ≤ 450 caractères génère un seul appel fetch', async () => {
    const shortText = 'Short text.';
    mockOk('Texte court.');
    await translateText(shortText, 'en', 'fr');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('translateBatch', () => {
  it('retourne un tableau vide si l\'entrée est vide', async () => {
    expect(await translateBatch([])).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('traduit chaque texte indépendamment', async () => {
    mockOk('Un');
    mockOk('Deux');
    mockOk('Trois');
    const result = await translateBatch(['One', 'Two', 'Three']);
    expect(result).toEqual(['Un', 'Deux', 'Trois']);
  });

  it('préserve l\'ordre des traductions', async () => {
    mockOk('Premier');
    mockOk('Deuxième');
    const result = await translateBatch(['First', 'Second'], 'en', 'fr');
    expect(result[0]).toBe('Premier');
    expect(result[1]).toBe('Deuxième');
  });

  it('traite correctement plus de 3 textes (2 batches)', async () => {
    for (let i = 1; i <= 4; i++) mockOk(`T${i}`);
    const result = await translateBatch(['A', 'B', 'C', 'D'], 'en', 'fr');
    expect(result).toEqual(['T1', 'T2', 'T3', 'T4']);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('retourne les originaux en cas d\'échec réseau', async () => {
    mockNetworkError();
    mockNetworkError();
    const result = await translateBatch(['Hello', 'World'], 'en', 'fr');
    expect(result).toEqual(['Hello', 'World']);
  });

  it('gère un batch mixte succès/échec', async () => {
    mockOk('Bonjour');
    mockFail(); // 'World' → retourne l'original
    const result = await translateBatch(['Hello', 'World'], 'en', 'fr');
    expect(result[0]).toBe('Bonjour');
    expect(result[1]).toBe('World');
  });
});
