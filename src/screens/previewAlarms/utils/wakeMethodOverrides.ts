export type WakeMethodMediaOverride = {
  uri?: string | number | null;
  name?: string | null;
  deleted?: boolean;
};

export const getWakeMethodOverrideKey = (method: any, index: number) => {
  const type =
    typeof method === 'string'
      ? String(method).toUpperCase()
      : String(method?.type || 'METHOD').toUpperCase();

  return String(
    (typeof method === 'string' ? null : method?.id) || `${type}-${index}`,
  );
};
