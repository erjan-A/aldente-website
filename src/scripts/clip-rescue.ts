/**
 * A second chance for a clip that fails to load. Some hosts and some phones refuse to stream an .mp4 they
 * would play from memory (a host without byte-range answers, on an iPhone). The clip is fetched whole, once,
 * and played from memory; `ready` then tells the caller it can be played.
 *
 * If that fails too, the clip becomes its still: the source and the controls go and the poster stays, so the
 * visitor sees the product picture and never a broken player. The element then carries data-still.
 */
export function rescueClip(video: HTMLVideoElement, ready: () => void): void {
  let tried = false;
  const still = (): void => {
    video.removeAttribute('src');
    video.controls = false;
    video.removeAttribute('tabindex');
    video.setAttribute('data-still', '');
    video.load();
  };
  video.addEventListener('error', () => {
    if (video.hasAttribute('data-still')) return;
    if (tried) return still();
    tried = true;
    const source = video.currentSrc || video.src;
    void (async () => {
      try {
        const response = await fetch(source);
        if (!response.ok) throw new Error(String(response.status));
        video.src = URL.createObjectURL(new Blob([await response.blob()], { type: 'video/mp4' }));
        video.load();
        ready();
      } catch {
        still();
      }
    })();
  });
}
