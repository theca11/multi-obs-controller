export const fields = `
<details class="info-details">
	<summary>
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
			<path d="M12 9h.01" />
			<path d="M11 12h1v4h1" />
		</svg>
		About Raw WS Requests
	</summary>
	<p>
	This is an advanced action that allows you to send a raw request 
	supported by the <a href="https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md#requests" target="_blank">OBS Websockets protocol</a> 
	</p>
	<p>
	The Request Type field requires a valid string, and the Request Data field requires a valid JSON object. Example:
	<br/><br/>
	Request Type: SetCurrentSceneProgram
	<br/>
	Request Data: {"sceneName": "my scene"}
	</p>
</details>
<div class="sdpi-item">
	<div class="sdpi-item-label" data-localize>Request Type</div>
	<input class="sdpi-item-value" type="text" name="requestType" required>
</div>
<div type="textarea" class="sdpi-item">
	<div class="sdpi-item-label" data-localize>Request Data</div>
	<div class="sdpi-item-value textarea">
		<textarea type="textarea" name="requestData" style="min-height: 6em;"></textarea>
	</div>
</div>
<div class="validation-info" style="text-align: right; margin-right: 14px;"></div>
`;
