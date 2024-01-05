export const fields = `
<div class="sdpi-item sequence-item">
	<div class="sdpi-item-label" data-localize>Key Sequence</div>
	<input class="sdpi-item-value" type="text" placeholder="Click here to add hotkey sequence" readonly data-localize>
	<input type="hidden" name="seq">
</div>
<details>
	<summary>Supported keys information</summary>
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
`;
