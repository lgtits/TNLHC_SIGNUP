<template>
  <q-layout view="hHh lpR fff">
    <!-- 嵌入 Google Sites 時不顯示 header / footer，版面交給外層網頁 -->
    <q-header v-if="!isEmbedded" class="main-header">
      <q-toolbar class="main-toolbar">
        <img :src="logoSrc" alt="世界之光聖教會" class="main-toolbar__logo" />
        <q-toolbar-title class="main-toolbar__title"
          >世界之光聖教會</q-toolbar-title
        >
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- 用一般 footer 而不是 QFooter：QFooter 在 QLayout 裡固定是 fixed，
         會一直浮在畫面底部。這裡要它跟著內容流到頁尾。 -->
    <footer v-if="!isEmbedded" class="main-footer">
      <div class="main-footer__inner">
        <img :src="logoSrc" alt="" class="main-footer__logo" />
        <span>© {{ year }} 世界之光聖教會</span>
      </div>
    </footer>
  </q-layout>
</template>

<script setup lang="ts">
import { useEmbed } from "src/lib/useEmbed";

const { isEmbedded } = useEmbed();

const year = new Date().getFullYear();

// 走 BASE_URL，部署到 GitHub Pages 子路徑時才不會抓成網域根目錄
const logoSrc = `${import.meta.env.BASE_URL}images/logo.png`;
</script>

<style scoped lang="scss">
.main-header {
  background: var(--ink);
  color: #fff;
  box-shadow: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.main-toolbar {
  max-width: var(--shell-max-width);
  width: 100%;
  margin: 0 auto;
  padding: 6px var(--content-pad-x);
  min-height: 64px;

  // logo 為白色去背，放在黑底上剛好
  &__logo {
    height: 44px;
    width: auto;
    flex: 0 0 auto;
    margin-right: 4px;
  }

  &__title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
}

.main-footer {
  background: var(--ink);
  color: rgba(255, 255, 255, 0.68);

  &__inner {
    max-width: var(--shell-max-width);
    width: 100%;
    margin: 0 auto;
    padding: 18px var(--content-pad-x);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11.5px;
    letter-spacing: 0.04em;
    display: flex;
    justify-content: center;
  }

  &__logo {
    height: 26px;
    width: auto;
    opacity: 0.75;
    flex: 0 0 auto;
  }
}
</style>
