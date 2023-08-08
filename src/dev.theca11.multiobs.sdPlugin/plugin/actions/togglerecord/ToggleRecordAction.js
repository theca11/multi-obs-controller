import { evtEmitter, getRecordStates } from '../../status.js';
import { OBSWebsocketAction } from '../OBSWebsocketAction.js';

export class ToggleRecordAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.togglerecord', { statusEvent: 'RecordStateChanged' });
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

	async fetchState(socketSettings, socketIdx) {
		return getRecordStates()[socketIdx];
	}

	// getStates() {
	// 	console.log('record getstates')
	// 	return getRecordStates();
	// }

	async shouldUpdateImage(evtData, socketSettings) {
		return true;
	}

	async getNewState(evtData, socketSettings) {
		return evtData.outputActive;
	}
}
