export const apiUrl = 'http://localhost:5000/api';

export const request = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${apiUrl}${url}`, { headers, ...options });
  if (!res.ok) throw new Error('API error');
  return res.json();
};
