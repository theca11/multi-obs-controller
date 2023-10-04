import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getRecordState } from '../states';

export class PauseRecordAction extends AbstractStatefulRequestAction {
	constructor() {
		super('dev.theca11.multiobs.pauserecord', { statusEvent: 'RecordStateChanged', statesColors: { on: '#de902a' } });
	}

	getPayloadFromSettings(settings: any, desiredState?: number | undefined) {
		if (desiredState === 0) {
			return { requestType: 'PauseRecord' };
		}
		else if (desiredState === 1) {
			return { requestType: 'ResumeRecord' };
		}
		else {
			return { requestType: 'ToggleRecordPause' };
		}
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const state = getRecordState(socketIdx);
		return state === 'paused' ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	async getStateFromEvent(evtData: any): Promise<StateEnum> {
		return evtData === 'paused' ? StateEnum.Active : StateEnum.Inactive;
	}
}
