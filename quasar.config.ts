import { defineConfig } from '#q-app/wrappers';

// GitHub Pages 的 project page 掛在 https://<user>.github.io/<repo>/ 底下，
// 所以 build 出來的資源要帶這層子路徑；本機 dev 則維持根目錄。
const GH_PAGES_BASE = '/TNLHC_SIGNUP/';

export default defineConfig((ctx) => {
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
      // 注意：這裡不能用 './'，Quasar 會把它正規化成 '/'，
      // 部署到 GitHub Pages 子路徑時 assets 會全部 404。
      publicPath: ctx.prod ? GH_PAGES_BASE : '/',
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
