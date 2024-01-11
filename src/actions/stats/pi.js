const { statField } = await import('./fields.js');

document.querySelectorAll('button.add').forEach((button) =>
	button.addEventListener('click', (event) => {
		event.preventDefault();
		const formEl = event.target.closest('form');
		formEl.querySelector('.stat-items').insertAdjacentHTML(
			'beforeend',
			statField,
		);
		formEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
	}),
);

document.querySelectorAll('.stat-items .icon-button').forEach((el) =>
	el.addEventListener('click', (event) => {
		event.preventDefault();
		if (!event.target.matches('button')) return;
		const formEl = event.target.closest('form');
		if (event.target.matches('.down')) {
			const group = event.target.closest('.stat-group');
			const parent = group.parentNode;
			const next = group.nextElementSibling;
			if (next) {
				parent.insertBefore(group, next.nextElementSibling);
			}
		}
		else if (event.target.matches('.up')) {
			const group = event.target.closest('.stat-group');
			const parent = group.parentNode;
			const previous = group.previousElementSibling;
			if (previous) {
				parent.insertBefore(group, previous);
			}
		}
		else if (event.target.matches('.remove')) {
			event.target.closest('.stat-group')?.remove();
		}
		formEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
	}),
);

// Hide long press and custom image advanced options
document.querySelector('#longPress').style.display = 'none';
document.querySelector('#customImgDiv').style.display = 'none';
