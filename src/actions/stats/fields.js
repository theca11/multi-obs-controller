export function generateFields({ stats }) {
	if (!stats) {
		stats = [''];
	}
	if (!Array.isArray(stats)) stats = [stats];
	let fieldsStr = '';
	fieldsStr += '<div class="stat-items">';
	for (let i = 0; i < stats.length; i++) {
		fieldsStr += `
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
		</div>`;
	}
	fieldsStr += '</div><button class="add">Add another stat</button>';
	return fieldsStr;
}
