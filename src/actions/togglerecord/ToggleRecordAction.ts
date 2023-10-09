import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { SocketSettings } from '../types';
import { StateEnum } from '../StateEnum';
import { SingleRequestPayload } from '../types.js';

type ActionSettings = Record<string, never>

export class ToggleRecordAction extends AbstractStatefulRequestAction<ActionSettings, 'RecordStateChanged'> {
	constructor() {
		super('dev.theca11.multiobs.togglerecord', { statusEvent: 'RecordStateChanged', statesColors: { on: '#cc3636' } });
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>, desiredState?: number | undefined): SingleRequestPayload<'StartRecord' | 'StopRecord' | 'ToggleRecord'> {
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

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const { outputActive, outputPaused } = await sockets[socketIdx].call('GetRecordStatus');
		return outputPaused ? StateEnum.Intermediate : outputActive ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	getStateFromEvent(evtData: { outputActive: boolean; outputState: string; outputPath: string; }): StateEnum {
		const { outputState } = evtData;
		switch (outputState) {
			case 'OBS_WEBSOCKET_OUTPUT_STARTED':
			case 'OBS_WEBSOCKET_OUTPUT_RESUMED':
				return StateEnum.Active;
			case 'OBS_WEBSOCKET_OUTPUT_STARTING':
			case 'OBS_WEBSOCKET_OUTPUT_PAUSED':
			case 'OBS_WEBSOCKET_OUTPUT_STOPPING':
				return StateEnum.Intermediate;
			case 'OBS_WEBSOCKET_OUTPUT_STOPPED':
			case 'OBS_WEBSOCKET_OUTPUT_UNKNOWN':
				return StateEnum.Inactive;
			default:
				return StateEnum.Inactive;
		}
	}
}
