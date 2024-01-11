export const fields = `
<details class="info-details">
	<summary>
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
			<path d="M12 9h.01" />
			<path d="M11 12h1v4h1" />
		</svg>
		About Raw WS Batch Requests
	</summary>
	<p>
	This is an advanced action that allows you to send a raw websocket batch request. 
	A batch request is a group of requests that are sent together to OBS, 
	and processed there normally in a serial way.
	</p>
	<p>
	The Requests Array field requires valid JSON with a properly formatted array of request objects,
	as expected by the <a href="https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md#requestbatch-opcode-8" target="_blank">OBS Websockets protocol</a>
	</p>
	<p style="white-space: pre">
Example:

[	
  {
    "requestType": "SetCurrentSceneTransition",
    "requestData": {"transitionName": "Fade"}
  },
  {
    "requestType": "Sleep",
    "requestData": {"sleepMillis": 100}
  },
  {
    "requestType": "TriggerStudioModeTransition"
  }
]
	</p>
</details>
<div class="sdpi-item">
    <div class="sdpi-item-label" data-localize>Execution Type</div>
    <select class="sdpi-item-value select" name="executionType">
       <option value="0" selected>SerialRealtime</option>
       <option value="1">SerialFrame</option>
       <option value="2">Parallel</option>
    </select>
</div>
<div type="checkbox" class="sdpi-item">
    <div class="sdpi-item-label" data-localize>Halt on Failure</div>
	<div class="sdpi-item-value">
		<input id="chk0" type="checkbox" name="haltOnFailure" value="true">
    	<label for="chk0"><span></span></label>
	</div>
</div>
<div type="textarea" class="sdpi-item">
	<div class="sdpi-item-label" data-localize>Requests Array</div>
	<div class="sdpi-item-value textarea">
		<textarea type="textarea" name="requestsArray" style="min-height: 10.5em;" required></textarea>
	</div>
</div>
<div class="validation-info" style="text-align: right; margin-right: 14px;"></div>
`;
