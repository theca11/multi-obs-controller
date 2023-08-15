import { AbstractStatefulWsAction } from '../AbstractStatefulWsAction';
import { getStreamState } from '../states';

export class ToggleStreamAction extends AbstractStatefulWsAction {
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

	async fetchState(socketSettings: any, socketIdx: number): Promise<boolean | null> {
		return getStreamState(socketIdx);
	}

	// getStates() {
	// 	return getStreamStates();
	// }

	async shouldUpdateState(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean> {
		return true;
	}

	async getStateFromEvent(evtData: any, socketSettings: any): Promise<boolean> {
		return evtData.outputActive;
	}
}
