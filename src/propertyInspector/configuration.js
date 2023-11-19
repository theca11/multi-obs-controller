import { FormUtils } from './utils.js';

window.onload = () => {
	const formEl = document.querySelector('form');

	// Load global settings to form
	const globalSettings = window.opener.getGlobalSettings();
	FormUtils.setFormValue(globalSettings, formEl);

	// Send settigs to property inspect on form edit
	formEl.addEventListener(
		'input',
		Utils.debounce(500, () => {
			const formData = Object.fromEntries(new FormData(formEl));
			window.opener.sendGlobalSettingsToInspector(formData);
		}),
	);
};

document.querySelector('#reconnect').addEventListener('click', (e) => {
	e.preventDefault();
	window.opener.reconnect();
});
