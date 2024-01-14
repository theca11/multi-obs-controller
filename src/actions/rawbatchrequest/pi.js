document.querySelectorAll('textarea').forEach((el, idx) => {
	validate(el, idx); // initial validation

	el.addEventListener('input', Utils.debounce(500, () => { // validation on input change
		validate(el, idx);
	}));
});

function validate(el, idx) {
	const infoEl = document.querySelectorAll('.validation-info')[idx];
	try {
		if (el.value) {
			const validJson = JSON.parse(el.value);
			el.value = JSON.stringify(validJson, undefined, 2);
		}
		el.style.color = '#d8d8d8';
		infoEl.style.color = '#9a9a9a';
		infoEl.textContent = $PI.localize('Valid JSON data');
	}
	catch (e) {
		el.style.color = '#d39090';
		infoEl.style.color = '#d39090';
		infoEl.textContent = $PI.localize('Invalid JSON data');
	}
}
