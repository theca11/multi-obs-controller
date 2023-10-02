import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getStreamState } from '../states';

export class ToggleStreamAction extends AbstractStatefulRequestAction {
	constructor() {
		super('dev.theca11.multiobs.togglestream', { statusEvent: 'StreamStateChanged', statesColors: { on: '#5a9b4a' } });
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

	async fetchState(socketSettings: any, socketIdx: number): Promise<StateEnum.Active | StateEnum.Inactive> {
		return getStreamState(socketIdx) ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	async getStateFromEvent(evtData: any): Promise<StateEnum> {
		return evtData.outputActive ? StateEnum.Active : StateEnum.Inactive;
	}
}
