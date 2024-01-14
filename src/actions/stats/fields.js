export const statField = `
<div class="stat-group sdpi-item" style="align-items: center">
	<div class="sdpi-item-value" style="margin-left: 13px">
		<select class="select" style="margin-right: 0px" name="stats">
			<option hidden selected value="">${$PI.localize('- Select stat -')}</option>
			<optgroup label="${$PI.localize('General')}">
				<option value="general.cpuUsage">${$PI.localize('CPU Usage')}</option>
				<option value="general.memoryUsage">${$PI.localize('Memory Usage')}</option>
				<option value="general.availableDiskSpace">${$PI.localize('Available Disk')}</option>
				<option value="general.activeFps">${$PI.localize('Active FPS')}</option>
				<option value="general.averageFrameRenderTime">${$PI.localize('Average frame render time')}</option>
				<option value="general.renderSkippedFrames">${$PI.localize('Missed frames - rendering lag')}</option>
				<option value="general.outputSkippedFrames">${$PI.localize('Skipped frames - encoding lag')}</option>
			</optgroup>
			<optgroup label=${$PI.localize('Stream')}>
				<option value="stream.outputActive">${$PI.localize('Active status')}</option>
				<option value="stream.outputSkippedFrames">${$PI.localize('Dropped frames - network congestion')}</option>
			</optgroup>
			<optgroup label=${$PI.localize('Record')}>
				<option value="record.outputActive">${$PI.localize('Active status')}</option>
			</optgroup>
		</select>
		<input type="color" style="margin: 0 4px 0 6px" name="colors" value="#ffffff" title="Text color" data-i18n>
		<button class="down icon-button icon-down" title="Move down stat" data-i18n></button>
		<button class="up icon-button icon-up" title="Move up stat" data-i18n></button>
		<button class="remove icon-button icon-remove" title="Remove stat" data-i18n></button>
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
			<button class="add" style="margin: 0 0 0 auto" data-i18n>Add stat</button>
		</div>
	</div>
	`;
	return fieldsStr;
}
