// Key variables
const key = {
	str: null,
	code: null,
};
const modifiers = {
	Control: false,
	Shift: false,
	Alt: false,
	Meta: false,
};
const keyboardLayoutMap = await navigator.keyboard.getLayoutMap().catch(() => null);

// Init shown sequence input field and add event listeners to it
document.querySelectorAll('.sequence-item .sdpi-item-value').forEach((input) => {
	const sequence = input.parentElement.querySelector('input[name="seq"]').value;
	let shownSequence = '';
	const sequenceKey = sequence.split(' + ').pop();
	if (['Alt', 'AltGraph', 'Control', 'Shift', 'Meta'].includes(sequenceKey)) {
		shownSequence = sequence; // no key included apart from modifiers, sequence is the same
	}
	else {
		const keyStr = getKeyLayoutString(sequenceKey);
		shownSequence = sequence.replace(sequenceKey, keyStr); // replace key code value with key string
	}
	input.value = shownSequence;

	input.addEventListener('click', onClickHandler);
	input.addEventListener('keydown', onKeyDownHandler);
	input.addEventListener('keyup', onKeyUpHandler);
});

function onClickHandler(event) {
	event.target.value = '';
	event.target.placeholder = 'Waiting for key sequence press...';
	resetKeys();
}

function onKeyDownHandler(event) {
	event.preventDefault();
	event.stopPropagation();
	if (event.repeat) return;
	if (!['Alt', 'AltGraph', 'Control', 'Shift', 'Meta'].includes(event.key)) {
		key.str = getKeyLayoutString(event.code);
		key.code = event.code;
	}
	else if (event.key === 'AltGraph') {
		modifiers['Alt'] = true;
		modifiers['Control'] = true;
	}
	else {
		modifiers[event.key] = true;
	}
	event.target.value = generateSequenceString();
}

function onKeyUpHandler(event) {
	event.preventDefault();
	event.stopPropagation();
	event.target.blur();
	event.target.parentElement.querySelector('input[name="seq"]').value = generateSequenceString(true);
	event.target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
	resetKeys();
}

/**
 * Reset currently logged keys
 */
function resetKeys() {
	key.str = null;
	key.code = null;
	for (const m of Object.keys(modifiers)) {
		modifiers[m] = false;
	}
}

/**
 * Get the string associated with a key press, dependant on keyboard layout/locale
 * @param {string} keyCode KeyboardEvent code string associated to the key
 * @returns {string} Key string, capitalized
 */
function getKeyLayoutString(keyCode) {
	const keyString = keyboardLayoutMap?.get(keyCode);
	if (!keyString || keyString === 'Dead') return keyCode;
	if (keyCode.startsWith('Numpad')) return keyCode;
	if (keyString === ' ') return 'Spacebar';
	return keyString.charAt(0).toUpperCase() + keyString.slice(1); // Capitalized key string
}

/**
 * Generate sequence string based on logged keys
 * @param {boolean} useKeyCode Whether to use the JS key code value to represent the key
 * @returns {string} Sequence string with format Modifier1 [+ ModifierN...] + Key
 * (e.g. Control + Shift + A or Control + Shift + KeyA)
 */
function generateSequenceString(useKeyCode = false) {
	const strTokens = [];
	for (const m of Object.keys(modifiers)) {
		if (modifiers[m]) {
			strTokens.push(m);
		}
	}
	if (key.str) {
		strTokens.push(useKeyCode ? key.code : key.str);
	}
	return strTokens.join(' + ');
}
