export const ENV = {
  wsUrl: import.meta.env.VITE_WS_URL || '',
  apiUrl: import.meta.env.VITE_API_URL || '',
  isLive: !!import.meta.env.VITE_WS_URL,
  cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  cognitoRegion: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
};
