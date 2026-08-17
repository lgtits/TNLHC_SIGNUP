import { defineConfig } from '#q-app/wrappers';

export default defineConfig(() => {
  return {
    // 啟動檔（順序有意義：config 先讀完，embed 才知道要用哪個模式）
    boot: ['config', 'embed'],

    css: ['app.scss'],

    extras: ['roboto-font', 'material-icons'],

    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },
      typescript: {
        strict: true,
        vueShim: true,
      },
      vueRouterMode: 'hash',
      // 用相對路徑，方便丟到任何靜態空間再 iframe 嵌入 Google Sites
      publicPath: './',
    },

    devServer: {
      open: false,
      port: 9000,
    },

    framework: {
      config: {
        brand: {
          primary: '#2f6f5e',
          secondary: '#c98b4b',
          accent: '#7a5bd6',
          dark: '#1d1d1d',
          positive: '#1f9d6b',
          negative: '#d3455b',
          info: '#3a7bd5',
          warning: '#e0a12a',
        },
      },
      plugins: ['Notify'],
    },

    animations: [],
  };
});
