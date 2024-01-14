export const fields = `
<div class="sdpi-item">
	<div class="sdpi-item-label" data-i18n>Source</div>
	<input class="sdpi-item-value" type="text" name="inputName" list="inputList" required>
	<datalist id="inputList"></datalist>
</div>
<div class="sdpi-item action-select">
    <div class="sdpi-item-label" data-i18n>Action</div>
    <select class="sdpi-item-value select" name="action">
       <option value="play_stop" selected>${$PI.localize('Play/Stop')}</option>
       <option value="play_pause">${$PI.localize('Play/Pause')}</option>
       <option value="restart">${$PI.localize('Restart')}</option>
	   <option value="stop">${$PI.localize('Stop')}</option>
    </select>
</div>
`;
