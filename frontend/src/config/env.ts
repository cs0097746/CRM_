const isDevelopment = import.meta.env.DEV;

const backend_url = isDevelopment 
  ? 'http://localhost:8000'  // ✅ Desenvolvimento
  : 'https://backend.loomiecrm.com';   // ✅ Produção (altere quando fizer deploy)

export default backend_url;