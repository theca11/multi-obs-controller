import { OBSWebsocketAction } from '../OBSWebsocketAction';
import { getRecordState } from '../states';

export class ToggleRecordAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.togglerecord', { statusEvent: 'RecordStateChanged' });
	}

	getPayloadFromSettings(settings: any, desiredState?: number | undefined) {
		if (desiredState === 0) {
			return { requestType: 'StartRecord' };
		} else if (desiredState === 1) {
			return { requestType: 'StopRecord' };
		} else {
			return { requestType: 'ToggleRecord' };
		}
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<boolean | null | undefined> {
		return getRecordState(socketIdx);
	}

	// getStates() {
	// 	console.log('record getstates')
	// 	return getRecordStates();
	// }

	async shouldUpdateImage(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean> {
		return true;
	}

	async getNewState(evtData: any, socketSettings: any): Promise<boolean> {
		return evtData.outputActive;
	}
}
