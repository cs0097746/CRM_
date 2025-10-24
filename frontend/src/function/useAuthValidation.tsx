import { useEffect } from "react";
import { getToken, logout} from "./validateToken.tsx";

export function useAuthValidation(setIsLoggedIn: (value: boolean) => void, setLoading: (value: boolean) => void) {
  useEffect(() => {
    const validateAuth = async () => {
      setLoading(true);

      try {
        const token = await getToken();

        if (token) {
          console.log("✅ Token válido — usuário autenticado");
          setIsLoggedIn(true);
        } else {
          console.log("❌ Sem token válido — redirecionando para login");
          logout();
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error("💥 Erro ao validar token:", err);
        logout();
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    validateAuth();
  }, [setIsLoggedIn, setLoading]);
}
