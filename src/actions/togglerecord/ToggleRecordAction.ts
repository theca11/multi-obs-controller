import { AbstractStatefulWsAction } from '../AbstractStatefulWsAction';
import { getRecordState } from '../states';

export class ToggleRecordAction extends AbstractStatefulWsAction {
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

	async fetchState(socketSettings: any, socketIdx: number): Promise<boolean | null> {
		return getRecordState(socketIdx);
	}

	async shouldUpdateState(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean> {
		return true;
	}

	async getStateFromEvent(evtData: any, socketSettings: any): Promise<boolean> {
		return evtData.outputActive;
	}
}
