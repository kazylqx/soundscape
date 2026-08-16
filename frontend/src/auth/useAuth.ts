import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './AuthContext';

/**
 * Acesso ao estado de autenticacao.
 * Precisa estar dentro de <AuthProvider> (montado no App.tsx).
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.');
  }

  return context;
}
