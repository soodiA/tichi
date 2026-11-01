const KEY_STORAGE = 'tichi-admin-key';

export const getAdminKey = (): string => {
  try { return localStorage.getItem(KEY_STORAGE) ?? ''; } catch { return ''; }
};

export const setAdminKey = (k: string) => {
  try { k ? localStorage.setItem(KEY_STORAGE, k) : localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ }
};
