// Options page script for dan-chrome-etc

const FEATURE_IDS = [
  'github-comment-editor',
  'github-fullwidth',
  'github-mermaid-cleaner',
  'github-comment-fold',
  'keybr-finger-colors',
] as const;

type FeatureId = typeof FEATURE_IDS[number];
type Settings = Record<FeatureId, boolean>;

const DEFAULT_SETTINGS: Settings = {
  'github-comment-editor': true,
  'github-fullwidth': true,
  'github-mermaid-cleaner': true,
  'github-comment-fold': true,
  'keybr-finger-colors': true,
};

async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ settings });
}

function showStatus(): void {
  const status = document.getElementById('status');
  if (status) {
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 2000);
  }
}

async function init(): Promise<void> {
  const settings = await loadSettings();

  // Set initial checkbox states
  for (const id of FEATURE_IDS) {
    const checkbox = document.getElementById(id) as HTMLInputElement | null;
    if (checkbox) {
      checkbox.checked = settings[id];

      // Add change listener
      checkbox.addEventListener('change', async () => {
        settings[id] = checkbox.checked;
        await saveSettings(settings);
        showStatus();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', init);


