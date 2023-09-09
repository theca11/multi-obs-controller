document.querySelectorAll('button.add').forEach((button) =>
	button.addEventListener('click', (event) => {
		event.preventDefault();
		const formEl = event.target.closest('form');
		formEl.querySelector('.stat-items').insertAdjacentHTML(
			'beforeend',
			`
			<div class="stat-group sdpi-item" style="align-items: center">
				<div class="sdpi-item-label empty"></div>
				<select class="sdpi-item-value select" style="margin-right: 2px" name="stats">
					<option hidden selected value="">- Select stat -</option>
					<option value="general.cpuUsage">CPU Usage</option>
					<option value="general.memoryUsage">Memory Usage</option>
					<option value="general.availableDiskSpace">Available Disk</option>
				</select>
				<input type="color" class="sdpi-item-value" style="margin: 0 2px" name="colors" value="#efefef">
				<button class="down icon sdpi-item-value">⬇</button>
				<button class="up icon sdpi-item-value">⬆</button>
				<button class="remove icon sdpi-item-value">✖</button>
			</div>`,
		);
		formEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
	}),
);

document.querySelectorAll('.stat-items').forEach((el) =>
	el.addEventListener('click', (event) => {
		if (!event.target.matches('button')) return;
		const formEl = event.target.closest('form');
		if (event.target.matches('.down')) {
			event.preventDefault();
			const group = event.target.closest('.stat-group');
			const parent = group.parentNode;
			const next = group.nextElementSibling;
			if (next) {
				parent.insertBefore(group, next.nextElementSibling);
			}
		}
		else if (event.target.matches('.up')) {
			event.preventDefault();
			const group = event.target.closest('.stat-group');
			const parent = group.parentNode;
			const previous = group.previousElementSibling;
			if (previous) {
				parent.insertBefore(group, previous);
			}
		}
		else if (event.target.matches('.remove')) {
			event.preventDefault();
			event.target.closest('.stat-group')?.remove();
		}
		formEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
	}),
);
