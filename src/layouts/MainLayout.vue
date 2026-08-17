<template>
  <q-layout view="hHh lpR fFf">
    <!-- 嵌入 Google Sites 時不顯示 header / footer，版面交給外層網頁 -->
    <q-header v-if="!isEmbedded" elevated class="bg-primary text-white">
      <q-toolbar class="main-toolbar">
        <q-btn
          v-if="canGoBack"
          flat
          dense
          round
          icon="arrow_back"
          aria-label="返回"
          @click="goBack"
        />
        <q-toolbar-title class="text-weight-bold">TNLHC 活動報名</q-toolbar-title>
        <q-btn flat dense no-caps label="活動列表" icon="event" @click="goPortal" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer v-if="!isEmbedded" class="bg-white text-grey-7">
      <div class="main-footer">
        <span>© {{ year }} TNLHC．本頁為 UI 展示，資料皆為模擬</span>
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEmbed } from 'src/lib/useEmbed';

const route = useRoute();
const router = useRouter();
const { isEmbedded } = useEmbed();

const year = new Date().getFullYear();
const canGoBack = computed(() => route.name !== 'portal');

function goBack() {
  router.back();
}

function goPortal() {
  void router.push({ name: 'portal' });
}
</script>

<style scoped lang="scss">
.main-toolbar {
  max-width: var(--shell-max-width);
  width: 100%;
  margin: 0 auto;
}

.main-footer {
  max-width: var(--shell-max-width);
  width: 100%;
  margin: 0 auto;
  padding: 12px 16px;
  font-size: 12px;
  border-top: 1px solid var(--hairline);
}
</style>
