/**
 * Hand a fetched file to the browser's own download machinery.
 *
 * The export route is bearer-authenticated, so a plain anchor cannot reach it — the token
 * lives in memory and is never in a cookie or a URL. The file is fetched with the header
 * attached and then handed over as an object URL, which is revoked immediately afterwards so
 * the blob is not held for the life of the tab.
 */

/**
 * @param {Blob} blob The fetched file.
 * @param {string} filename The name to save it under.
 * @returns {void}
 */
export function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default downloadFile;
