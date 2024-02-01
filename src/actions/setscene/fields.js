export const fields = `
<div class="sdpi-item">
	<div class="sdpi-item-label" data-i18n>Scene</div>
	<input class="sdpi-item-value" type="text" name="sceneName" list="sceneList" required>
	<datalist id="sceneList"></datalist>
</div>
<div class="sdpi-item" title="${$PI.localize('Studio Mode Target tooltip')}">
	<div class="sdpi-item-label" data-i18n>${$PI.localize('Studio Mode Scene Target')}</div>
	<select class="sdpi-item-value select" name="studioTarget">
		<option value="preview" selected>${$PI.localize('Preview')}</option>
		<option value="program">${$PI.localize('Program')}</option>
	</select>
</div>
`;
