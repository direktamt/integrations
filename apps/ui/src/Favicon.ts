import faviconUrl from '@direktamt/ui-kit/assets/favicon.svg';

/**
 * Points the document icon at the DirektAmt favicon shipped with the UI kit.
 */
export function applyFavicon(): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) {
    link.href = faviconUrl;
  }
}
