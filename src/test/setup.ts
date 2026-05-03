import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

// jsdom doesn't implement window.scrollTo and TanStack Router calls it on
// every navigation for scroll restoration. Stub it as a no-op so tests stay
// quiet without disabling JSDOM's other not-implemented warnings.
if (globalThis.window !== undefined) {
  globalThis.window.scrollTo = () => {};
}

// jsdom 25 doesn't implement HTMLDialogElement.showModal/close. Polyfill the
// minimum surface our <dialog>-based components use.
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
}
