/// <reference path="../libs/js/property-inspector.js" />
/// <reference path="../libs/js/utils.js" />
import { FormUtils } from "./utils.js";

let forms = new Map();	// common form and per OBS instance forms
let globalSettings = {};

// Initialization when PI connects
$PI.onConnected(async (jsn) => {
    const { actionInfo } = jsn;
    const { payload, action } = actionInfo;
    const { settings } = payload;

	$PI.getGlobalSettings();

	// Insert tabs and action fields
	const actionName = action.split('.').at(-1);
	const { fields } = await import(`../actions/${actionName}/fields.js`)
	.catch(() =>{ console.log('No custom fields loaded'); return {}});
	if (fields) {
		const tabs = [];
		const tabsContents = [];
		for (let i=1; i<=2; i++) {	// 2 OBS instances
			tabs.push(`
				<div class="tab${i == 0 ? " selected" : ""}" data-target="#tab${i}" title="OBS instance ${i}">OBS${i}</div>
			`);
			tabsContents.push(`
				<div id="tab${i}" class="tab-container">
					<form id="action-fields-${i}">
						${indexHtmlFields(fields, i)}
					</form>
				</div>
			`);
			forms.set(`params${i}`,`#action-fields-${i}`);
		}
		document.querySelector('.tabs').innerHTML=tabs.join('');
		document.querySelector('.tabs-contents').innerHTML=tabsContents.join('');
		activateTabs();
		document.querySelector('.first-separator').style.display = 'block';
	}
	else {
		document.querySelector('#indivParams').style.display = 'none';	// hide indiv params box if not fields
	}

	// Load all forms with action settings
	forms.set('common', '#common-fields');
	initForms(settings);

	// Add target and shared params logic
	onTargetChange();
	Array.from(document.querySelectorAll('#target input')).forEach(i => i.addEventListener('change', () => onTargetChange()));
	document.querySelector('#indivParamsCheck').addEventListener('change', () => updateTargetTabs());

	// Load custom action PI JS, if it exists
	await import(`../actions/${actionName}/pi.js`).catch(() => console.log('No custom action JS loaded'));

	// Signal plugin that PI is ready after importing everything
	$PI.sendToPlugin({event: 'ready'});

	// Show PI contents
	document.querySelector('.sdpi-wrapper').style.visibility = 'visible';
});

// Update global settings variable on change
$PI.onDidReceiveGlobalSettings(({payload}) => {
	globalSettings = payload.settings;
})

// Open external configuration window
document.querySelector('#open-config').addEventListener('click', () => {
    window.open('./configuration.html');
});

/**
 * Load all forms, and set listener to update settings on forms change
 * @param {object} settings Action settings
 */
function initForms(settings) {
	forms.forEach((formSelector, key) => {
		const form = document.querySelector(formSelector)
		FormUtils.setFormValue(settings[key], form);

		// Add listener to save on input change
		form.addEventListener(
			'input',
			Utils.debounce(150, () => {
				let updatedSettings = {}
				forms.forEach((form, key) => {
					const formValue = FormUtils.getFormValue(form)
					updatedSettings = {...updatedSettings, [key]: formValue}
				})
				$PI.setSettings(updatedSettings);
			})
		);
	})
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
}

window.sendGlobalSettingsToInspector = (settings) => {
	$PI.setGlobalSettings(settings);
	globalSettings = settings;
};


// --- Tabs logic ---
function activateTabs(activeTab) {
    const allTabs = Array.from(document.querySelectorAll('.tab'));
    let activeTabEl = null;
    allTabs.forEach((el, i) => {
        el.onclick = () => clickTab(el);
        if(el.dataset?.target === activeTab) {
            activeTabEl = el;
        }
    });
    if(activeTabEl) {
        clickTab(activeTabEl);
    } else if(allTabs.length) {
        clickTab(allTabs[0]);
    }
}

function clickTab(clickedTab) {
    const allTabs = Array.from(document.querySelectorAll('.tab'));
    allTabs.forEach((el, i) => el.classList.remove('selected'));
    clickedTab.classList.add('selected');
    allTabs.forEach((el, i) => {
        if(el.dataset.target) {
            const t = document.querySelector(el.dataset.target);
            if(t) {
                t.style.display = el == clickedTab ? 'block' : 'none';
            }
        }
    });
}

function updateTargetTabs() {
	const indivParamsCheckbox = document.querySelector('#indivParamsCheck');
	if (!indivParamsCheckbox.checked) {
		clickTab(document.querySelector('.tab')) // click first tab
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
			clickTab(tabs[target-1]);
			document.querySelector('#indivParams').style.display = 'none';
			document.querySelector('#tabs-header').style.display = 'none';
		}
	}
	else {
		document.querySelector('#tabs-header').style.display = 'none';
	}
}
// ---