document.querySelectorAll('button.add').forEach((button) =>
	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.target.parentNode.querySelector('.stat-items').insertAdjacentHTML(
			'beforeend',
			`
			<div class="stat-group">
				<select name="stats">
					<option hidden selected value="">- Select a stat to display -</option>
					<option value="general.cpuUsage">CPU Usage</option>
					<option value="general.memoryUsage">Memory Usage</option>
					<option value="general.availableDisk">Available Disk</option>
				</select>
				<input type="color" name="colors" value="#efefef"/>
				<button class="down">Down</button>
				<button class="up">Up</button>
				<button class="remove">Delete</button>
			</div>`,
		);
		event.target.closest('form').dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
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
