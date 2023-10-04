import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { SocketSettings } from '../types';
import { StateEnum } from '../StateEnum';
import { SingleRequestPayload } from '../types';

type ActionSettings = Record<string, never>

export class ToggleStreamAction extends AbstractStatefulRequestAction<ActionSettings, 'StreamStateChanged'> {
	constructor() {
		super('dev.theca11.multiobs.togglestream', { statusEvent: 'StreamStateChanged', statesColors: { on: '#5a9b4a' } });
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>, desiredState?: number | undefined): SingleRequestPayload<'StartStream' | 'StopStream' | 'ToggleStream'> {
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

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const { outputActive, outputReconnecting } = await sockets[socketIdx].call('GetStreamStatus');
		return outputReconnecting ? StateEnum.Intermediate : outputActive ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	async getStateFromEvent(evtData: { outputActive: boolean; outputState: string; }): Promise<StateEnum> {
		const { outputState } = evtData;
		switch (outputState) {
			case 'OBS_WEBSOCKET_OUTPUT_STARTED':
			case 'OBS_WEBSOCKET_OUTPUT_RECONNECTED':
				return StateEnum.Active;
			case 'OBS_WEBSOCKET_OUTPUT_STARTING':
			case 'OBS_WEBSOCKET_OUTPUT_RECONNECTING':
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
