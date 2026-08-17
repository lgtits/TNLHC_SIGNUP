import type { EventItem } from 'src/types/signup';

/** 模擬網路延遲，讓 loading 狀態看得出來 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(fileName: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}mockData/${fileName}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`載入 mock 資料失敗：${fileName} (${res.status})`);
  }
  await delay(320);
  return (await res.json()) as T;
}

export async function loadMockEventList(): Promise<EventItem[]> {
  return fetchJson<EventItem[]>('mockEventList.json');
}
