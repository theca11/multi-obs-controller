import { StateEnum } from '../AbstractBaseWsAction';
import { AbstractStatefulWsAction } from '../AbstractStatefulWsAction';
import { getStreamState } from '../states';

export class ToggleStreamAction extends AbstractStatefulWsAction {
	constructor() {
		super('dev.theca11.multiobs.togglestream', { statusEvent: 'StreamStateChanged', statesColors: { on: '#60d66266' } });
	}

	getPayloadFromSettings(settings: any, desiredState?: number | undefined) {
		if (desiredState === 0) {
			return { requestType: 'StartStream' };
		}
		else if (desiredState === 1) {
			return { requestType: 'StopStream' };
		}
		else {
			return { requestType: 'ToggleStream' };
		}
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<StateEnum> {
		return getStreamState(socketIdx) ? StateEnum.Active : StateEnum.Inactive;
	}

	// getStates() {
	// 	return getStreamStates();
	// }

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	async getStateFromEvent(evtData: any): Promise<StateEnum> {
		return evtData.outputActive ? StateEnum.Active : StateEnum.Inactive;
	}
}
