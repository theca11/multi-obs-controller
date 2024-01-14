export const fields = `
<details class="info-details">
	<summary>
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
			<path d="M12 9h.01" />
			<path d="M11 12h1v4h1" />
		</svg>
		Supported keys information
	</summary>
	<p>A key sequence may contain one or more modifier keys (Control, Shift, Alt, Meta) and at most one main key.</p>
	<p>The following main keys are supported and should work regardless of keyboard layout/locale:
		<li>Alphanumeric keys: A-Z, 0-9</li>
		<li>Comma and period keys: , .</li>
		<li>Numpad keys: 0-9, Add, Substract, Divide, Multiply, Decimal, Enter</li>
		<li>Special keys: Escape, Enter, Spacebar, Tab, CapsLock, NumLock, ScrollLock</li>
		<li>Arrow keys: Up, Down, Left, Right</li>
		<li>Control keys: PageUp, PageDown, Insert, Delete, Home, End</li>
		<li>Function keys: F1-F12</li>
	</p>
	<p>Other keys are not supported or are only partially supported and may not work.</p>
</details>
<div class="sdpi-item sequence-item">
	<div class="sdpi-item-label" data-i18n>Key Sequence</div>
	<input class="sdpi-item-value" type="text" placeholder="Click here to add hotkey sequence" readonly data-i18n>
	<input type="hidden" name="seq">
</div>
`;
