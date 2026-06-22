export default {
  base: "./",
  server: {
    strictPort: true,
    proxy: {
      "/master-data": "http://127.0.0.1:4180",
      "/api": "http://127.0.0.1:4180"
    }
  }
};
