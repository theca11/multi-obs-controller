export const statField = `
<div class="stat-group sdpi-item" style="align-items: center">
	<div class="sdpi-item-value" style="margin-left: 20px">
		<select class="select" style="margin-right: 0px" name="stats">
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
		<input type="color" style="margin: 0 4px 0 6px" name="colors" value="#ffffff" title="Text color"/>
		<button class="down icon-button icon-down" title="Move down stat"></button>
		<button class="up icon-button icon-up" title="Move up stat"></button>
		<button class="remove icon-button icon-remove" title="Remove stat"></button>
	</div>
</div>`;

export function generateFields({ stats }) {
	if (!stats) {
		stats = [''];
	}
	if (!Array.isArray(stats)) stats = [stats];
	let fieldsStr = '';
	fieldsStr += '<div class="stat-items">';
	for (let i = 0; i < stats.length; i++) {
		fieldsStr += statField;
	}
	fieldsStr += `
	</div>
	<div class="sdpi-item">
		<div class="sdpi-item-label empty"></div>
		<div class="sdpi-item-value">
			<button class="add" style="margin: 0 0 0 auto">Add stat</button>
		</div>
	</div>
	`;
	return fieldsStr;
}
