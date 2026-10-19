const storagePrefix = 'aia.settings.';

function getDefaultSpeechLanguage() {
    const browserLanguage = globalThis.navigator?.language?.toLowerCase();
    return browserLanguage?.startsWith('en') ? 'en' : 'de';
}

export const dialogSettings = Object.freeze([
    Object.freeze({ key: 'showComponentPosition', controlId: 'setting-show-component-position', section: 'view', label: 'Show component position', type: 'checkbox', defaultValue: false }),
    Object.freeze({ key: 'animateComponents', controlId: 'setting-animate-components', section: 'view', label: 'Animate components', type: 'checkbox', defaultValue: false }),
    Object.freeze({ key: 'followFlowCamera', controlId: 'setting-follow-flow-camera', section: 'view', label: 'Follow flow camera', type: 'checkbox', defaultValue: false }),
    Object.freeze({ key: 'flowCameraTransitionDuration', controlId: 'setting-flow-camera-duration', section: 'view', label: 'Camera transition duration', type: 'slider', min: 0.1, max: 5, step: 0.1, unit: ' s', defaultValue: 1.5 }),
    Object.freeze({ key: 'speechEnabled', controlId: 'setting-speech-enabled', section: 'speech', label: 'Enable speech output', type: 'checkbox', defaultValue: false }),
    Object.freeze({ key: 'speechLanguage', controlId: 'setting-speech-language', section: 'speech', label: 'Language', type: 'select', options: [{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }], defaultValue: getDefaultSpeechLanguage() }),
    Object.freeze({ key: 'speechVoice', controlId: 'setting-speech-voice', section: 'speech', label: 'Voice', type: 'select', dynamicOptions: true, defaultValue: '' }),
    Object.freeze({ key: 'speechRate', controlId: 'setting-speech-rate', section: 'speech', label: 'Speech rate', type: 'slider', min: 0.5, max: 1.5, step: 0.1, defaultValue: 1.0 })
]);

export const dialogSections = Object.freeze([
    Object.freeze({ key: 'view', title: 'View', settingKeys: ['showComponentPosition', 'animateComponents', 'followFlowCamera', 'flowCameraTransitionDuration'], includesCameraControls: true, includesGridToggle: true }),
    Object.freeze({ key: 'speech', title: 'Speech output', settingKeys: ['speechEnabled', 'speechLanguage', 'speechVoice', 'speechRate'] })
]);

const settingsByKey = new Map(dialogSettings.map(setting => [setting.key, setting]));

function createDefaultSettings() {
    return Object.fromEntries(dialogSettings.map(({ key, defaultValue }) => [key, defaultValue]));
}

function isValidValue(key, value) {
    const setting = settingsByKey.get(key);
    if (!setting) {
        return false;
    }

    if (setting.type === 'checkbox') {
        return typeof value === 'boolean';
    }
    if (setting.type === 'slider') {
        return typeof value === 'number' && Number.isFinite(value) && value >= setting.min && value <= setting.max;
    }
    if (key === 'speechLanguage') {
        return value === 'de' || value === 'en';
    }
    if (key === 'speechVoice') {
        return typeof value === 'string';
    }
    return false;
}

function loadSettings() {
    const loadedSettings = createDefaultSettings();

    try {
        for (const { key } of dialogSettings) {
            const storedValue = globalThis.localStorage?.getItem(`${storagePrefix}${key}`);
            if (storedValue === null || storedValue === undefined) {
                continue;
            }

            const value = JSON.parse(storedValue);
            if (isValidValue(key, value)) {
                loadedSettings[key] = value;
            }
        }
    } catch {
        return createDefaultSettings();
    }

    return loadedSettings;
}

let currentSettings = loadSettings();

export function getSettings() {
    return { ...currentSettings };
}

export function getSetting(key) {
    return currentSettings[key];
}

export function setSetting(key, value) {
    if (!isValidValue(key, value)) {
        return false;
    }

    currentSettings[key] = value;
    try {
        globalThis.localStorage?.setItem(`${storagePrefix}${key}`, JSON.stringify(value));
    } catch {
        // Keep the updated value for this session when browser storage is unavailable.
    }
    return true;
}

export function resetSettings() {
    currentSettings = createDefaultSettings();
    try {
        for (const { key } of dialogSettings) {
            globalThis.localStorage?.removeItem(`${storagePrefix}${key}`);
        }
    } catch {
        // Defaults remain active for this session when browser storage is unavailable.
    }
    return getSettings();
}