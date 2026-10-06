/**
 * Inserts markup the way a browser does when deferred module scripts upgrade parsed
 * HTML: the subtree is complete before any custom element connects.
 */
export function mount(html: string): void {
  const template = document.createElement('template');
  template.innerHTML = html;
  document.body.replaceChildren(template.content.cloneNode(true));
}
