document.querySelectorAll('textarea').forEach((el, idx) => {
	el.addEventListener('input', () => {
		const buttonEl = document.querySelectorAll('.validate')[idx];
		buttonEl.textContent = 'Validate JSON    ❔';
	});
});

document.querySelectorAll('.validate').forEach((el, idx) => {
	el.addEventListener('click', (ev) => {
		ev.preventDefault();
		const textareaEl = document.querySelectorAll('textarea')[idx];
		try {
			JSON.parse(textareaEl.value);
			el.textContent = 'Validate JSON    ✔';
		}
		catch {
			el.textContent = 'Validate JSON    ❌';
		}
	});
});