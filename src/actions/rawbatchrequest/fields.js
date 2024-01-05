export const fields = `
<div class="sdpi-item" id="select_single">
    <div class="sdpi-item-label" data-localize>Execution Type</div>
    <select class="sdpi-item-value select" name="executionType">
       <option value="0" selected>SerialRealtime</option>
       <option value="1">SerialFrame</option>
       <option value="2">Parallel</option>
    </select>
</div>
<div type="checkbox" class="sdpi-item">
    <div class="sdpi-item-label" data-localize>Halt on Failure</div>
    <input class="sdpi-item-value" id="chk0" type="checkbox" name="haltOnFailure" value="true">
    <label for="chk0"><span></span></label>
</div>
<div type="textarea" class="sdpi-item">
	<div class="sdpi-item-label" data-localize>Requests Array</div>
	<span class="sdpi-item-value textarea">
		<textarea type="textarea" class="four-lines" name="requestsArray" required></textarea>
	</span>
</div>
<div class="sdpi-item">
	<div class="sdpi-item-label empty"></div>
	<button class="sdpi-item-value validate" style="white-space: pre-wrap">Validate JSON    ❔</button>
</div>
<details>
	<summary>About Raw WS Batch Requests</summary>
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
`;
