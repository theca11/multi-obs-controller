import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { SingleRequestPayload, SocketSettings } from '../types';


type ActionSettings = Record<string, never>

export class PauseRecordAction extends AbstractStatefulRequestAction<ActionSettings, 'RecordStateChanged'> {
	constructor() {
		super('dev.theca11.multiobs.pauserecord', { statusEvent: 'RecordStateChanged', statesColors: { active: '#de902a' } });
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'PauseRecord' | 'ResumeRecord' | 'ToggleRecordPause'> {
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

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const { outputPaused } = await sockets[socketIdx].call('GetRecordStatus');
		return outputPaused ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	override getStateFromEvent(evtData: { outputActive: boolean; outputState: string; outputPath: string; }): StateEnum {
		const { outputState } = evtData;
		return outputState === 'OBS_WEBSOCKET_OUTPUT_PAUSED' ? StateEnum.Active : StateEnum.Inactive;
	}
}
