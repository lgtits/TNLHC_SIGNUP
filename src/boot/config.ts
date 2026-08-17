import { defineBoot } from '#q-app/wrappers';
import { useConfigStore } from 'src/stores/config-store';

/** 在 app 掛載前把 public/config.json 讀進來 */
export default defineBoot(async ({ store }) => {
  const configStore = useConfigStore(store);
  await configStore.loadConfig();
});
