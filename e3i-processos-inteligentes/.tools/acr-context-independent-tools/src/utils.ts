export function getErrorMessage(err: any, defaultMsg = 'Ocorreu um erro.'): string {
  if (!err) return defaultMsg;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err.error === 'string') return err.error;
  if (err.error && typeof err.error === 'object') {
    if (typeof err.error.message === 'string') return err.error.message;
  }
  if (typeof err.message === 'string') return err.message;
  if (typeof err === 'object') {
    if (typeof err.error === 'string') return err.error;
    if (typeof err.msg === 'string') return err.msg;
  }
  return defaultMsg;
}

export function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('e3i_token') : null;
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {}
  return headers;
}

