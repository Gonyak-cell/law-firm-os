const apiProxyTarget = process.env.LAWOS_WEB_API_PROXY_TARGET ?? "http://127.0.0.1:4180";

export default {
  base: "./",
  server: {
    strictPort: true,
    proxy: {
      "/master-data": apiProxyTarget,
      "/api": apiProxyTarget
    }
  }
};
