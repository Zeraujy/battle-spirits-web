/*
 * BATTLE SPIRITS ETERNAL SIMULATOR v3
 * CONFIGURAÇÃO DO ONLINE
 *
 * Para trocar o servidor, altere SOMENTE o valor de serverUrl abaixo.
 * Este arquivo é carregado em tempo de execução: não precisa recompilar o site.
 */
window.BATTLE_SPIRITS_ONLINE_CONFIG = {
  serverUrl: "https://desktop-88e9pl9.tail8fb8c7.ts.net",
  healthPath: "/health",
  connectionTimeoutMs: 10000,
  transports: ["websocket", "polling"]
};
