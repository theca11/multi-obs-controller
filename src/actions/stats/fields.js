export function generateFields({ stats }) {
	if (!stats) {
		stats = [''];
	}
	if (!Array.isArray(stats)) stats = [stats];
	let fieldsStr = '';
	fieldsStr += '<div class="stat-items">';
	for (let i = 0; i < stats.length; i++) {
		fieldsStr += `
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
		</div>`;
	}
	fieldsStr += `
	</div>
	<div class="sdpi-item">
		<div class="sdpi-item-label empty"></div>
		<button class="add sdpi-item-value" style="margin-top: 8px">Add another stat</button>
	</div>
	`;
	return fieldsStr;
}
