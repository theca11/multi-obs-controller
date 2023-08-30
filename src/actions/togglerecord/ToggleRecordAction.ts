import { StateEnum } from '../AbstractBaseWsAction';
import { AbstractStatefulWsAction } from '../AbstractStatefulWsAction';
import { getRecordState } from '../states';

export class ToggleRecordAction extends AbstractStatefulWsAction {
	constructor() {
		super('dev.theca11.multiobs.togglerecord', { statusEvent: 'RecordStateChanged', statesColors: { on: '#ff000066' } });
	}

	getPayloadFromSettings(settings: any, desiredState?: number | undefined) {
		if (desiredState === 0) {
			return { requestType: 'StartRecord' };
		}
		else if (desiredState === 1) {
			return { requestType: 'StopRecord' };
		}
		else {
			return { requestType: 'ToggleRecord' };
		}
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<StateEnum> {
		return getRecordState(socketIdx) ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	async getStateFromEvent(evtData: any): Promise<StateEnum> {
		return evtData.outputActive ? StateEnum.Active : StateEnum.Inactive;
	}
}
