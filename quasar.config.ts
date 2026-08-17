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
          primary: '#0b0b0b',
          secondary: '#6b6b6b',
          accent: '#3d3d3d',
          dark: '#0b0b0b',
          positive: '#1d6f4a',
          negative: '#a32b22',
          info: '#3d3d3d',
          warning: '#8a6a1f',
        },
      },
      plugins: ['Notify'],
    },

    animations: [],
  };
});
