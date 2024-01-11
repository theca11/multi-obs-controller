export const fields = `
<div class="sdpi-item">
	<div class="sdpi-item-label" data-localize>Scene/Source</div>
	<input class="sdpi-item-value" type="text" name="screenshotTarget" placeholder="Set to Output for current program output" required data-localize>
</div>
<div type="range" class="sdpi-item">
    <div class="sdpi-item-label" data-localize>Quality/Size</div>
    <div class="sdpi-item-value">
        <span value="0">Min</span>
        <input type="range" name="quality" min="0" max="100" step="25" value="75">
        <span value="100">Max</span>
    </div>
</div>
`;
