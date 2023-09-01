import { AbstractStatelessWsAction } from '../AbstractStatelessWsAction';

export class TriggerHotkeyAction extends AbstractStatelessWsAction {
	constructor() {
		super('dev.theca11.multiobs.triggerhotkey');
	}

	getPayloadFromSettings(settings: any) {
		const { seq } = settings;
		return {
			requestType: 'TriggerHotkeyByKeySequence',
			requestData: parseSequenceString(seq),
		};
	}
}

type KeyCombination = {
	keyId?: string,
	keyModifiers: { control?: boolean, shift?: boolean, alt?: boolean, command?: boolean }
}

/**
 * Parses a hotkey sequence string into an OBS websocket compatible object
 * @param sequence The hotkey sequence string as saved in action settings (e.g. Control + Shift + KeyA)
 * Object with key and modifiers as expected by OBS websocket request
 */
function parseSequenceString(sequence: string): KeyCombination {
	const data: KeyCombination = { keyModifiers: {} };
	const strTokens = sequence.split(' + ');
	for (const token of strTokens) {
		switch (token) {
			case 'Control':
				data.keyModifiers.control = true;
				break;
			case 'Shift':
				data.keyModifiers.shift = true;
				break;
			case 'Alt':
				data.keyModifiers.alt = true;
				break;
			case 'Meta':
				data.keyModifiers.command = true;
				break;
			default: {
				const obsKey = jsKeyToObsKey(token);
				if (obsKey) {
					data.keyId = obsKey;
				}
			}
		}
	}

	return data;
}

/**
 * Converts Javascript KeyboardEvent code string to OBS key string
 * @param code {@link https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values | KeyboardEvent code string}
 * @returns {@link https://github.com/obsproject/obs-studio/blob/master/libobs/obs-hotkeys.h | OBS key string}
 */
function jsKeyToObsKey(code: string): string {
	if (code.substring(0, 6) == 'Numpad' && code.length == 7) {
		return 'OBS_KEY_NUM' + code.substring(6);
	}
	else if (code.substring(0, 3) == 'Key') {
		return 'OBS_KEY_' + code.substring(3);
	}
	else if (code.substring(0, 5) == 'Digit') {
		return 'OBS_KEY_' + code.substring(5);
	}
	else if (code[0] == 'F' && code.length < 4) {
		return 'OBS_KEY_' + code;
	}

	const specialKeys = {
		NumpadSubtract: 'OBS_KEY_NUMMINUS',
		NumpadAdd: 'OBS_KEY_NUMPLUS',
		NumpadDecimal: 'OBS_KEY_NUMPERIOD',
		NumpadDivide: 'OBS_KEY_NUMSLASH',
		NumpadMultiply: 'OBS_KEY_NUMASTERISK',
		Tab: 'OBS_KEY_TAB',
		Space: 'OBS_KEY_SPACE',
		Period: 'OBS_KEY_PERIOD',
		Comma: 'OBS_KEY_COMMA',
		Semicolon: 'OBS_KEY_ASCIITILDE',
		ArrowUp: 'OBS_KEY_UP',
		ArrowDown: 'OBS_KEY_DOWN',
		ArrowLeft: 'OBS_KEY_LEFT',
		ArrowRight: 'OBS_KEY_RIGHT',
		Backquote: 'OBS_KEY_BACKSLASH',
		Minus: 'OBS_KEY_BRACKETLEFT',
		Equal: 'OBS_KEY_BRACKETRIGHT',
		BracketRight: 'OBS_KEY_PLUS',
		Backslash: 'OBS_KEY_SLASH',
		IntlBackslash: 'OBS_KEY_BACKSLASH_RT102',
		Slash: 'OBS_KEY_MINUS',
		Backspace: 'OBS_KEY_BACKSPACE',
		Quote: 'OBS_KEY_APOSTROPHE',
		Enter: 'OBS_KEY_RETURN',
		CapsLock: 'OBS_KEY_CAPSLOCK',
		NumLock: 'OBS_KEY_NUMLOCK',
		ScrollLock: 'OBS_KEY_SCROLLLOCK',
		Pause: 'OBS_KEY_PAUSE',
		Insert: 'OBS_KEY_INSERT',
		Home: 'OBS_KEY_HOME',
		End: 'OBS_KEY_END',
		Escape: 'OBS_KEY_ESCAPE',
		Delete: 'OBS_KEY_DELETE',
		PageUp: 'OBS_KEY_PAGEUP',
		PageDown: 'OBS_KEY_PAGEDOWN',
	};

	return specialKeys[code as keyof typeof specialKeys] ?? '';
}
