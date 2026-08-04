// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createModal, injectStyles } from '../src/widget/ui';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('widget UI styles', () => {
  it('defines the default border style where the border color is available', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    injectStyles(shadow, {
      position: 'bottom-right',
      theme: 'light',
    });

    const styleText = shadow.querySelector('style')?.textContent ?? '';
    const hostBlock = styleText.match(/:host\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    const rootBlock = styleText.match(/\.bd-root\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';

    expect(hostBlock).toContain('--bd-border-width: 1px;');
    expect(hostBlock).not.toContain('--bd-border-style:');
    expect(rootBlock).toContain('--bd-border: #e7e5e4;');
    expect(rootBlock).toContain(
      '--bd-border-style: var(--bd-border-width) solid var(--bd-border);'
    );
  });

  it('opens modals when matchMedia is unavailable', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    delete (window as Partial<Window>).matchMedia;

    // Drag repositioning (and its matchMedia use) only applies to the
    // annotator dialog now — the slide-out panel every other step uses isn't
    // draggable, so pass that modal class to exercise the same code path.
    expect(() =>
      createModal(root, 'Feedback', '<p>Body</p>', false, 'bd-modal--annotator')
    ).not.toThrow();
    expect(root.querySelector('.bd-modal')).not.toBeNull();
  });

  it('cleans up modal resize listeners when the modal is removed', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const root = document.createElement('div');
    document.body.appendChild(root);

    const modal = createModal(root, 'Feedback', '<p>Body</p>', false, 'bd-modal--annotator');
    modal.remove();
    await new Promise(resolve => window.setTimeout(resolve, 0));

    expect(addListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('does not attach drag behavior to non-annotator (slide-out panel) modals', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
    const addListener = vi.spyOn(window, 'addEventListener');
    const root = document.createElement('div');
    document.body.appendChild(root);

    createModal(root, 'Feedback', '<p>Body</p>');

    expect(addListener).not.toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('slides the panel in from the same edge as the trigger position', () => {
    const rightHost = document.createElement('div');
    const rightShadow = rightHost.attachShadow({ mode: 'open' });
    injectStyles(rightShadow, { position: 'bottom-right', theme: 'light' });
    const rightStyles = rightShadow.querySelector('style')?.textContent ?? '';
    const rightOverlayBlock = rightStyles.match(/\.bd-overlay\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    const rightModalBlock = rightStyles.match(/\.bd-modal\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(rightOverlayBlock).toContain('justify-content: flex-end;');
    expect(rightModalBlock).toContain('animation: bd-slideIn');

    const leftHost = document.createElement('div');
    const leftShadow = leftHost.attachShadow({ mode: 'open' });
    injectStyles(leftShadow, { position: 'bottom-left', theme: 'light' });
    const leftStyles = leftShadow.querySelector('style')?.textContent ?? '';
    const leftOverlayBlock = leftStyles.match(/\.bd-overlay\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    const leftModalBlock = leftStyles.match(/\.bd-modal\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(leftOverlayBlock).toContain('justify-content: flex-start;');
    expect(leftModalBlock).toContain('animation: bd-slideInLeft');
  });
});
