import api from '../services/api';

export interface ShapToken {
  token: string;
  value: number;
}

export async function fetchExplain(text: string): Promise<string> {
  try {
    const res = await api.post('/explain', { text });
    return res.data?.explanation || '';
  } catch (e) {
    console.error('Failed to fetch explanation', e);
    return '';
  }
}

export function parseShapInterpretations(raw?: string, maxTokens = 6): ShapToken[] {
  if (!raw || !raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const tokens = parsed
        .map((item) => {
          if (item && typeof item === 'object' && 'token' in item && 'value' in item) {
            return {
              token: String((item as { token: string }).token),
              value: Number((item as { value: number }).value)
            };
          }
          return null;
        })
        .filter((item): item is ShapToken => !!item && !Number.isNaN(item.value) && Math.abs(item.value) > 0.001);
      tokens.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      return tokens.slice(0, maxTokens);
    }

    if (parsed && typeof parsed === 'object') {
      const tokens = Object.entries(parsed)
        .map(([token, value]) => ({ token, value: Number(value) }))
        .filter((item) => !Number.isNaN(item.value) && Math.abs(item.value) > 0.001);
      tokens.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      return tokens.slice(0, maxTokens);
    }
  } catch {
    return [];
  }

  return [];
}

