import { evtEmitter, getStreamStates } from '../../status.js';
import { OBSWebsocketAction } from '../OBSWebsocketAction.js';

export class ToggleStreamAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.togglestream', { statusEvent: 'StreamStateChanged' });
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

	async fetchState(socketSettings, socketIdx) {
		return getStreamStates()[socketIdx];
	}

	// getStates() {
	// 	return getStreamStates();
	// }

	async shouldUpdateImage(evtData, socketSettings) {
		return true;
	}

	async getNewState(evtData, socketSettings) {
		return evtData.outputActive;
	}
}
