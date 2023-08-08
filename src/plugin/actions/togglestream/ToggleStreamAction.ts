import { getStreamStates } from '../../status';
import { OBSWebsocketAction } from '../OBSWebsocketAction';

export class ToggleStreamAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.togglestream', { statusEvent: 'StreamStateChanged' });
	}

	getPayloadFromSettings(settings: any, desiredState?: number | undefined) {
		if (desiredState === 0) {
			return { requestType: 'StartStream' };
		} else if (desiredState === 1) {
			return { requestType: 'StopStream' };
		} else {
			return { requestType: 'ToggleStream' };
		}
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<boolean | null | undefined> {
		return getStreamStates()[socketIdx];
	}

	// getStates() {
	// 	return getStreamStates();
	// }

	async shouldUpdateImage(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean> {
		return true;
	}

	async getNewState(evtData: any, socketSettings: any): Promise<boolean> {
		return evtData.outputActive;
	}
}
