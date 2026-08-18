import { defineConfig } from '#q-app/wrappers';

// 已綁自訂網域 https://events.tnlhc.org/，站台掛在網域根目錄，
// 所以 publicPath 用 '/'（自訂網域只能對應 repo 根，無法指到 /TNLHC_SIGNUP 子路徑，
// 而且 <user>.github.io/TNLHC_SIGNUP/ 會被 301 轉到自訂網域）。
//
// 若哪天拿掉自訂網域、要回頭用 project page，build 前設環境變數即可：
//   PUBLIC_PATH=/TNLHC_SIGNUP/ npm run build
const PUBLIC_PATH = process.env.PUBLIC_PATH || '/';

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
      vueRouterMode: 'history',
      // 注意：這裡不能用 './'，Quasar 會把它正規化成 '/'，
      // 部署到 GitHub Pages 子路徑時 assets 會全部 404。
      publicPath: ctx.prod ? PUBLIC_PATH : '/',
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
