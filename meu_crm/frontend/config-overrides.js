// frontend/config-overrides.js
module.exports = {
    devServer: function(configFunction) {
      return function(proxy, allowedHost) {
        const config = configFunction(proxy, allowedHost);
  
        // Modifica o cabeçalho de Content Security Policy
        config.headers = {
          ...config.headers,
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost;"
        };
  
        return config;
      };
    },
  };