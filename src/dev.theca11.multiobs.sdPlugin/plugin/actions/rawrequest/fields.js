export const fields = 
`
<div class="sdpi-item">
	<div class="sdpi-item-label">Request Type</div>
	<input class="sdpi-item-value" type="text" name="requestType" required>
</div>
<div type="textarea" class="sdpi-item">
	<div class="sdpi-item-label">Request Data</div>
	<span class="sdpi-item-value textarea">
		<textarea type="textarea" class="two-lines" name="requestData"></textarea>
	</span>
</div>
<div class="sdpi-item">
	<div class="sdpi-item-label empty"></div>
	<button class="sdpi-item-value validate" style="white-space: pre-wrap">Validate JSON    ❔</button>
</div>
<details>
	<summary>About Raw WS Requests</summary>
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
`