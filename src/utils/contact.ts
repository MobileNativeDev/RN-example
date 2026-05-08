export const cleanPhone = (input: string): string =>
  String(input || '').replace(/[^\d+]/g, '');

export const normalizeContactName = (input?: string | null): string => {
  let name = String(input || '').trim();
  name = name.replace(/[^\p{L}\p{N}\s\-_'.]/gu, '');
  name = name.trim();

  if (name.length > 100) {
    name = name.substring(0, 100);
  }

  return name || 'Unknown';
};
