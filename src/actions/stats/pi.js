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
					<optgroup label="General">
						<option hidden selected value="">- Select stat -</option>
						<option value="general.cpuUsage">CPU Usage</option>
						<option value="general.memoryUsage">Memory Usage</option>
						<option value="general.availableDiskSpace">Available Disk</option>
						<option value="general.activeFps">Active FPS</option>
						<option value="general.averageFrameRenderTime">Average frame render time</option>
						<option value="general.renderSkippedFrames">Missed frames - rendering lag</option>
						<option value="general.outputSkippedFrames">Skipped frames - encoding lag</option>
					</optgroup>
					<optgroup label="Stream">
						<option hidden selected value="">- Select stat -</option>
						<option value="stream.outputActive">Active status</option>
						<option value="stream.outputSkippedFrames">Dropped frames - network congestion </option>
					</optgroup>
					<optgroup label="Record">
						<option hidden selected value="">- Select stat -</option>
						<option value="record.outputActive">Active status</option>
					</optgroup>
				</select>	
				<input type="color" class="sdpi-item-value" style="margin: 0 2px" name="colors" value="#ffffff">
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

// Hide long press and custom image advanced options
document.querySelector('#longPress').style.display = 'none';
document.querySelector('#customImgDiv').style.display = 'none';