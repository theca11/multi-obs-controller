import { OBSWebsocketAction } from '../OBSWebsocketAction.js';

export class ToggleRecordAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.togglerecord');
	}

	getPayloadFromSettings(_settings, desiredState) {
		if (desiredState === 0) {
			return { requestType: 'StartRecord' };
		} else if (desiredState === 1) {
			return { requestType: 'StopRecord' };
		} else {
			return { requestType: 'ToggleRecord' };
		}
	}
}
