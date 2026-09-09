// Renders are proxied through the service worker because github.com's CSP has no
// connect-src for localhost, and service worker fetches are exempt from page CSP.

const D2_RENDER_URL = 'http://127.0.0.1:7119/';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'd2-render') return;
  renderD2(message.source).then(sendResponse);
  return true;
});

async function renderD2(source: string): Promise<D2RenderResponse> {
  try {
    const response = await fetch(D2_RENDER_URL, { method: 'POST', body: source });
    const body = await response.text();
    return response.ok ? { svg: body } : { compileError: body };
  } catch (e) {
    return { unavailable: String(e) };
  }
}
