// Shared between the background service worker and the d2 content script.
type D2RenderResponse =
  | { svg: string }
  | { compileError: string }
  | { unavailable: string };
