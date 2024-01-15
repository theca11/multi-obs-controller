// / <reference path="../libs/js/property-inspector.js" />
// / <reference path="../libs/js/utils.js" />
import { FormUtils, localizeUI } from './utils.js';

const NUM_INSTANCES = 2;
const forms = new Map(); // common form and per OBS instance forms
let globalSettings = {};

// Initialization when PI connects
$PI.onConnected(async (jsn) => {
	const { actionInfo } = jsn;
	const { payload, action } = actionInfo;
	const { settings } = payload;

	$PI.getGlobalSettings();

	// Insert tabs and action fields
	const actionName = action.split('.').at(-1);
	const { fields, generateFields } = await import(`../actions/${actionName}/fields.js`)
	.catch(() => { console.log('No custom fields loaded'); return {}; });
	if (fields || generateFields) {
		const tabs = [];
		const tabsContents = [];
		for (let i = 1; i <= NUM_INSTANCES; i++) {
			tabs.push(`
				<div class="tab${i == 0 ? ' selected' : ''}" data-target="#tab${i}">
					OBS${i}
				</div>
			`);
			tabsContents.push(`
				<div id="tab${i}" class="tab-container">
					<form id="action-fields-${i}">
						${indexHtmlFields(fields ?? generateFields(settings[`params${i}`] ?? {}), i)}
					</form>
				</div>
			`);
			forms.set(`params${i}`, `#action-fields-${i}`);
		}
		document.querySelector('.tabs').innerHTML = tabs.join('');
		document.querySelector('.tabs-contents').innerHTML = tabsContents.join('');
		activateTabs();
		document.querySelector('#first-separator').style.display = 'block';
	}
	else {
		document.querySelector('#indivParams').style.display = 'none'; // hide indiv params box if not fields
	}

	// Load all forms with action settings
	forms.set('common', '#common-fields');
	forms.set('advanced', '#advanced-fields');
	initForms(settings);

	// Add target and shared params logic
	if (!document.querySelector('input[name="target"]:checked')) {
		document.querySelector(`input[name="target"][value="${globalSettings.defaultTarget || 0}"]`).checked = true;
		document.querySelector('#common-fields').dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
	}

	onTargetChange();
	Array.from(document.querySelectorAll('#target input')).forEach((i) =>
		i.addEventListener('change', () => onTargetChange()),
	);
	document.querySelector('#indivParamsCheck').addEventListener('change', () => updateTargetTabs());

	// Hide long press options if inside multiaction (not supported)
	$PI.onDidReceiveSettings(action, ({ payload: receiveSettingsPayload }) => {
		if (receiveSettingsPayload.isInMultiAction) {
			document.querySelector('#longPress').style.display = 'none';
			document.querySelector('#customImgDiv').style.display = 'none';
		}
	});
	$PI.getSettings();

	// Load custom action PI JS, if it exists
	await import(`../actions/${actionName}/pi.js`).catch(() => console.log('No custom action JS loaded'));

	// Signal plugin that PI is ready after importing everything
	$PI.sendToPlugin({ event: 'ready' });

	// Localize UI
	localizeUI();

	// Show PI contents
	document.querySelector('.sdpi-wrapper').style.visibility = 'visible';
});

// Update global settings variable on change
$PI.onDidReceiveGlobalSettings(({ payload }) => {
	globalSettings = payload.settings;
	document.querySelector('#longPressMs').placeholder = globalSettings.longPressMs;
});

// Open external configuration window
document.querySelector('#open-config').addEventListener('click', () => {
	window.open('./configuration.html');
});

// Custom image picker functions/listeners
document.querySelector('input[name="customImg"]').addEventListener('click', (e) => {
	e.preventDefault();
	document.querySelector('#customImgFilePicker').click();
});

document.querySelector('#customImgFilePicker').addEventListener('input', (e) => {
	const imgPath = decodeURIComponent(e.target.value.replace(/^C:\\fakepath\\/, ''));

	if (imgPath) {
		const img = new Image();
		img.onload = function() {
			let x, y, width, height;
			if (this.width < 72 && this.height < 72) {
				width = this.width * 2;
				height = this.height * 2;
				x = Math.floor(72 - width / 2);
				y = Math.floor(72 - height / 2);
			}
			else if (this.width > this.height) {
				width = 144;
				height = Math.floor(this.height * 144 / this.width);
				x = 0;
				y = Math.floor(72 - height / 2);
			}
			else {
				height = 144;
				width = Math.floor(this.width * 144 / this.height);
				y = 0;
				x = Math.floor(72 - width / 2);
			}
			document.querySelector('input[name="customImg"]').value = imgPath;
			document.querySelector('input[name="customImgPos"]').value = [x, y, width, height].join(',');
			document.querySelector('#advanced-fields').dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
		};
		img.onerror = function() {
			document.querySelector('input[name="customImg"]').placeholder = $PI.localize('Error loading image');
			setTimeout(() => {
				document.querySelector('input[name="customImg"]').placeholder = $PI.localize('No custom icon image set');
			}, 3000);
		};
		img.src = imgPath;
	}
});

document.querySelector('#customImgRemoveButton').addEventListener('click', (e) => {
	e.preventDefault();
	document.querySelector('#customImgFilePicker').value = '';
	document.querySelector('input[name="customImg"]').value = '';
	document.querySelector('input[name="customImgPos"]').value = '';
	document.querySelector('#advanced-fields').dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
});
// --


/**
 * Load all forms, and set listener to update settings on forms change
 * @param {object} settings Action settings
 */
function initForms(settings) {
	forms.forEach((formSelector, settingsKey) => {
		const formEl = document.querySelector(formSelector);
		FormUtils.setFormValue(settings[settingsKey], formEl);

		// Add listener to save on input change
		formEl.addEventListener(
			'input',
			Utils.debounce(150, () => {
				let updatedSettings = {};
				forms.forEach((form, key) => {
					const formValue = FormUtils.getFormValue(form);
					if (Object.keys(formValue).length === 0 && formValue.constructor === Object) { // empty object
						return;
					}
					updatedSettings = { ...updatedSettings, [key]: formValue };
				});
				$PI.setSettings(updatedSettings);
			}),
		);
	});
}

/**
 * Updates an HTML string by adding unique indexes to id/for/list attributes
 * @param {string} fields Fields HTML string to modify
 * @param {number} index Index number to use
 * @returns Updated fields HTML string
 */
function indexHtmlFields(fields, index) {
	return fields.replace(/(id="|for="|list=")(\S+?)(")/g, `$1$2-${index}$3`);
}

/**
 * Window level functions to use in the external configuration window
 */
window.getGlobalSettings = () => {
	return globalSettings;
};

window.sendGlobalSettingsToInspector = (settings) => {
	$PI.setGlobalSettings(settings);
	globalSettings = settings;
	document.querySelector('#longPressMs').placeholder = globalSettings.longPressMs;
};

window.reconnect = () => {
	$PI.sendToPlugin({ event: 'reconnect' });
};

window.openUrl = (url) => {
	$PI.openUrl(url);
};

// --- Tabs logic ---
function activateTabs(activeTab) {
	const allTabs = Array.from(document.querySelectorAll('.tab'));
	let activeTabEl = null;
	allTabs.forEach((el) => {
		el.onclick = () => clickTab(el);
		if (el.dataset?.target === activeTab) {
			activeTabEl = el;
		}
	});
	if (activeTabEl) {
		clickTab(activeTabEl);
	}
	else if (allTabs.length) {
		clickTab(allTabs[0]);
	}
}

function clickTab(clickedTab) {
	const allTabs = Array.from(document.querySelectorAll('.tab'));
	allTabs.forEach((el) => el.classList.remove('selected'));
	clickedTab.classList.add('selected');
	allTabs.forEach((el) => {
		if (el.dataset.target) {
			const t = document.querySelector(el.dataset.target);
			if (t) {
				t.style.display = el == clickedTab ? 'block' : 'none';
			}
		}
	});
}

function updateTargetTabs() {
	const indivParamsCheckbox = document.querySelector('#indivParamsCheck');
	if (!indivParamsCheckbox.checked) {
		clickTab(document.querySelector('.tab')); // click first tab
		document.querySelector('#tabs-header').style.display = 'none';
	}
	else {
		document.querySelector('#tabs-header').style.display = 'block';
	}
}

function onTargetChange() {
	const target = parseInt(document.querySelector('input[name="target"]:checked').value);
	const tabs = Array.from(document.querySelectorAll('.tab'));
	if (tabs.length) {
		if (target == 0) {
			document.querySelector('#indivParams').style.display = 'flex';
			updateTargetTabs();
		}
		else {
			clickTab(tabs[target - 1]);
			document.querySelector('#indivParams').style.display = 'none';
			document.querySelector('#tabs-header').style.display = 'none';
		}
	}
	else {
		document.querySelector('#tabs-header').style.display = 'none';
	}
}
// ---
