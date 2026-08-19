<template>
  <q-page class="portal-page">
    <div class="page-shell">
      <header class="page-heading">
        <p class="eyebrow">Events</p>
        <h1 class="page-heading__title">活動報名</h1>
        <p class="page-heading__desc">選擇想參加的活動，填好資料即完成報名。</p>
      </header>

      <!-- Loading -->
      <div v-if="isLoading" class="portal-page__list">
        <div v-for="n in 3" :key="n" class="surface-card">
          <q-skeleton height="86px" square />
          <div class="q-pa-md">
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="40%" />
            <q-skeleton type="text" width="80%" class="q-mt-sm" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="surface-card portal-page__state">
        <q-icon name="wifi_off" size="34px" color="grey-6" />
        <p>{{ error }}</p>
        <q-btn unelevated no-caps color="primary" label="重新載入" @click="reload" />
      </div>

      <!-- Empty -->
      <div v-else-if="!signupStore.events.length" class="surface-card portal-page__state">
        <q-icon name="event_busy" size="34px" color="grey-6" />
        <p>目前沒有開放報名的活動，請稍後再回來看看。</p>
      </div>

      <!-- List -->
      <div v-else class="portal-page__list">
        <EventCard
          v-for="event in signupStore.events"
          :key="event.id"
          :event="event"
          :show-tags="configStore.SHOW_EVENT_TAGS"
          @select="goSignup"
          @lookup="goLookup"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EventCard from 'components/EventCard.vue';
import { useEventList } from 'src/lib/useEvents';
import { useSignupStore } from 'src/stores/signup-store';
import { useConfigStore } from 'src/stores/config-store';
import type { EventItem } from 'src/types/signup';

const router = useRouter();
const signupStore = useSignupStore();
const configStore = useConfigStore();
const { isLoading, error, load } = useEventList();

onMounted(() => {
  // 回到列表就把前一次的報名流程清乾淨
  signupStore.reset();
  void load();
});

function reload() {
  void load(true);
}

function goLookup() {
  void router.push({ name: 'lookup' });
}

function goSignup(event: EventItem) {
  if (event.status === 'closed' || event.status === 'full') return;
  void router.push({ name: 'signup', params: { eventId: event.id } });
}
</script>

<style scoped lang="scss">
.portal-page {
  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--card-gap);
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px var(--content-pad-x);
    text-align: center;

    p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }
  }
}
</style>
