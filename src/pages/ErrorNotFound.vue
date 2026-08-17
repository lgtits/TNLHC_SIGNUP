<template>
  <div class="not-found">
    <q-icon name="explore_off" size="48px" color="grey-6" />
    <h1>找不到這個頁面</h1>
    <q-btn unelevated no-caps color="primary" label="回活動列表" to="/" />
  </div>
</template>

<style scoped lang="scss">
.not-found {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 40px 16px;
  text-align: center;

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }
}
</style>
