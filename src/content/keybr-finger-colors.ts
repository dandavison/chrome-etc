// Keybr Finger Colors
// Colors each letter in the typing practice text based on which finger should type it
// Uses colors matching the keybr keyboard visualization

(async function () {
  // Check if feature is enabled in settings
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || {};
  if (settings['keybr-finger-colors'] === false) {
    console.log('[Keybr Finger Colors] Disabled in settings');
    return;
  }

  console.log('[Keybr Finger Colors] Script initializing...');

  // Finger color mappings (matching keybr's keyboard colors)
  const FINGER_COLORS = {
    leftPinky: '#66bb6a',    // Green - pinky
    leftRing: '#a5b34d',     // Mossy yellow-green - ring
    leftMiddle: '#ffb74d',   // Orange - middle
    leftIndex: '#78909c',    // Bluish gray - index
    rightIndex: '#f06292',   // Pink - index
    rightMiddle: '#ffb74d',  // Orange - middle
    rightRing: '#a5b34d',    // Mossy yellow-green - ring
    rightPinky: '#66bb6a',   // Green - pinky
    thumb: '#e57373',        // Coral/red - thumb (space)
  };

  // Map each lowercase letter to its finger
  const LETTER_TO_FINGER: Record<string, keyof typeof FINGER_COLORS> = {
    // Left pinky
    'q': 'leftPinky',
    'a': 'leftPinky',
    'z': 'leftPinky',
    '1': 'leftPinky',
    '`': 'leftPinky',
    '~': 'leftPinky',
    '!': 'leftPinky',

    // Left ring
    'w': 'leftRing',
    's': 'leftRing',
    'x': 'leftRing',
    '2': 'leftRing',
    '@': 'leftRing',

    // Left middle
    'e': 'leftMiddle',
    'd': 'leftMiddle',
    'c': 'leftMiddle',
    '3': 'leftMiddle',
    '#': 'leftMiddle',

    // Left index (includes both home and reach columns)
    'r': 'leftIndex',
    'f': 'leftIndex',
    'v': 'leftIndex',
    't': 'leftIndex',
    'g': 'leftIndex',
    'b': 'leftIndex',
    '4': 'leftIndex',
    '5': 'leftIndex',
    '$': 'leftIndex',
    '%': 'leftIndex',

    // Right index (includes both home and reach columns)
    'y': 'rightIndex',
    'h': 'rightIndex',
    'n': 'rightIndex',
    'u': 'rightIndex',
    'j': 'rightIndex',
    'm': 'rightIndex',
    '6': 'rightIndex',
    '7': 'rightIndex',
    '^': 'rightIndex',
    '&': 'rightIndex',

    // Right middle
    'i': 'rightMiddle',
    'k': 'rightMiddle',
    ',': 'rightMiddle',
    '8': 'rightMiddle',
    '*': 'rightMiddle',
    '<': 'rightMiddle',

    // Right ring
    'o': 'rightRing',
    'l': 'rightRing',
    '.': 'rightRing',
    '9': 'rightRing',
    '(': 'rightRing',
    '>': 'rightRing',

    // Right pinky
    'p': 'rightPinky',
    ';': 'rightPinky',
    ':': 'rightPinky',
    '/': 'rightPinky',
    '?': 'rightPinky',
    '0': 'rightPinky',
    ')': 'rightPinky',
    '-': 'rightPinky',
    '_': 'rightPinky',
    '=': 'rightPinky',
    '+': 'rightPinky',
    '[': 'rightPinky',
    '{': 'rightPinky',
    ']': 'rightPinky',
    '}': 'rightPinky',
    '\\': 'rightPinky',
    '|': 'rightPinky',
    "'": 'rightPinky',
    '"': 'rightPinky',

    // Thumb
    ' ': 'thumb',
  };

  function getFingerColor(char: string): string | null {
    const lowerChar = char.toLowerCase();
    const finger = LETTER_TO_FINGER[lowerChar] || LETTER_TO_FINGER[char];
    if (finger) {
      return FINGER_COLORS[finger];
    }
    return null;
  }

  // Find the text input container - keybr uses dir="ltr" on the text display
  function findTextContainer(): Element | null {
    // The text container has dir="ltr" and contains spans with inline-block style
    const candidates = document.querySelectorAll('div[dir="ltr"]');
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      // Check if it contains word spans
      if (el.querySelector('span[style*="inline-block"]')) {
        console.log('[Keybr Finger Colors] Found text container:', el);
        return el;
      }
    }

    // Fallback: look for the Ubuntu Mono font container
    const fontContainers = document.querySelectorAll('[style*="Ubuntu Mono"]');
    for (let i = 0; i < fontContainers.length; i++) {
      const el = fontContainers[i];
      if (el.querySelector('span[style*="inline-block"]')) {
        console.log('[Keybr Finger Colors] Found text container via font:', el);
        return el;
      }
    }

    return null;
  }

  function colorizeSpan(span: Element): void {
    const text = span.textContent;
    if (!text) return;

    // Skip if already processed
    if (span.getAttribute('data-finger-colored') === 'true') {
      return;
    }

    // If span has only one character, just color it directly
    if (text.length === 1) {
      const color = getFingerColor(text);
      if (color) {
        (span as HTMLElement).style.color = color;
        span.setAttribute('data-finger-colored', 'true');
      }
      return;
    }

    // For multiple characters, we need to split into individual spans
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const color = getFingerColor(char);
      const charSpan = document.createElement('span');
      charSpan.textContent = char;
      charSpan.setAttribute('data-finger-colored', 'true');
      if (color) {
        charSpan.style.color = color;
      }
      fragment.appendChild(charSpan);
    }

    // Replace span's content with colored spans
    span.textContent = '';
    span.appendChild(fragment);
    span.setAttribute('data-finger-colored', 'true');
  }

  function findAndColorizeTypingText(): void {
    const container = findTextContainer();
    if (!container) {
      console.log('[Keybr Finger Colors] No text container found');
      return;
    }

    // Find word spans (display: inline-block)
    const wordSpans = container.querySelectorAll('span[style*="inline-block"]');
    console.log('[Keybr Finger Colors] Found', wordSpans.length, 'word spans');

    for (let i = 0; i < wordSpans.length; i++) {
      const wordSpan = wordSpans[i];

      // Find letter spans inside (they have color: var(--textinput__color) or similar)
      const letterSpans = wordSpan.querySelectorAll('span[style*="color"]');

      if (letterSpans.length > 0) {
        console.log('[Keybr Finger Colors] Word', i, 'has', letterSpans.length, 'letter spans');
        for (let j = 0; j < letterSpans.length; j++) {
          colorizeSpan(letterSpans[j]);
        }
      } else {
        // Direct text content in the word span
        const text = wordSpan.textContent;
        if (text && text.trim()) {
          console.log('[Keybr Finger Colors] Word', i, 'has direct text:', text);
          colorizeSpan(wordSpan);
        }
      }
    }
  }

  function setupMutationObserver(): void {
    let debounceTimer: number | null = null;

    const observer = new MutationObserver(() => {
      // Debounce to avoid too many updates
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        // Clear processed markers for re-colorization
        const processed = document.querySelectorAll('[data-finger-colored="true"]');
        for (let i = 0; i < processed.length; i++) {
          processed[i].removeAttribute('data-finger-colored');
        }
        findAndColorizeTypingText();
      }, 50);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    console.log('[Keybr Finger Colors] Mutation observer set up');
  }

  function init(): void {
    console.log('[Keybr Finger Colors] Initializing...');

    // Add custom styles for !important override
    const style = document.createElement('style');
    style.id = 'keybr-finger-colors-style';
    style.textContent = `
      [data-finger-colored="true"] {
        color: inherit;
      }
    `;
    document.head.appendChild(style);

    // Initial colorization with retries
    findAndColorizeTypingText();

    // Watch for changes
    setupMutationObserver();

    // Retry a few times as the page loads
    setTimeout(findAndColorizeTypingText, 500);
    setTimeout(findAndColorizeTypingText, 1000);
    setTimeout(findAndColorizeTypingText, 2000);
    setTimeout(findAndColorizeTypingText, 3000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[Keybr Finger Colors] Script loaded');
})();
