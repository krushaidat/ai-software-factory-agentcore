export const ENV = {
  wsUrl: import.meta.env.VITE_WS_URL || '',
  apiUrl: import.meta.env.VITE_API_URL || '',
  isLive: !!import.meta.env.VITE_WS_URL,
};
