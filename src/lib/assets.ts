/**
 * 把資料裡的圖片路徑轉成可用的網址。
 *
 * 資料只存檔名（例如 "cover.jpg"），實際部署路徑由 BASE_URL 決定，
 * 這樣搬到 GitHub Pages 子路徑或換網域都不用改資料。
 * 已經是完整網址（http/https/data）就原樣回傳。
 */
export function assetUrl(path?: string): string {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
