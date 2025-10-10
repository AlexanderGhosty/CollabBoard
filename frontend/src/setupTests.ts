import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

if (typeof MutationObserver === 'undefined') {
  class MockMutationObserver {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_callback: (...args: unknown[]) => void) {}
    observe = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }
  // @ts-expect-error assign mock observer for jsdom
  globalThis.MutationObserver = MockMutationObserver;
}

const ensureDialogPrototype = () => {
  const attachMocks = (DialogClass: typeof HTMLDialogElement) => {
    DialogClass.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
      (this as any).open = true;
    });

    DialogClass.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      (this as any).open = false;
    });
  };

  if (typeof HTMLDialogElement === 'undefined') {
    class MockDialogElement extends HTMLElement {
      open = false;
    }

    attachMocks(MockDialogElement as unknown as typeof HTMLDialogElement);
    // @ts-expect-error assign mock dialog for jsdom
    globalThis.HTMLDialogElement = MockDialogElement;
  } else {
    attachMocks(HTMLDialogElement);
  }
};

ensureDialogPrototype();

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}

if (!HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = vi.fn();
}
