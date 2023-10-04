import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getRecordState } from '../states';

export class ToggleRecordAction extends AbstractStatefulRequestAction {
	constructor() {
		super('dev.theca11.multiobs.togglerecord', { statusEvent: 'RecordStateChanged', statesColors: { on: '#cc3636' } });
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

	async fetchState(socketSettings: any, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const state = getRecordState(socketIdx);
		return state === 'on' ? StateEnum.Active : state === 'paused' ? StateEnum.Intermediate : StateEnum.Inactive;
	}

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	async getStateFromEvent(evtData: any): Promise<StateEnum> {
		return evtData === 'on' ? StateEnum.Active : evtData === 'paused' ? StateEnum.Intermediate : StateEnum.Inactive;
	}
}
