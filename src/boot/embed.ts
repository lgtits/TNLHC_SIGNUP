import { defineBoot } from '#q-app/wrappers';
import { initEmbed } from 'src/lib/useEmbed';
import { useConfigStore } from 'src/stores/config-store';

/** 要排在 config boot 之後，才拿得到 EMBED_MODE */
export default defineBoot(({ store }) => {
  const configStore = useConfigStore(store);
  initEmbed(configStore.EMBED_MODE);
});
