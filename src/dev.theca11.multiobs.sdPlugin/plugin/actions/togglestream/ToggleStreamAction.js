import { OBSWebsocketAction } from '../OBSWebsocketAction.js';

export class ToggleStreamAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.togglestream');
	}

	getPayloadFromSettings(_settings, desiredState) {
		if (desiredState === 0) {
			return { requestType: 'StartStream' };
		} else if (desiredState === 1) {
			return { requestType: 'StopStream' };
		} else {
			return { requestType: 'ToggleStream' };
		}
	}
}
