import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = Record<string, never>

export class TriggerStudioModeTransitionAction extends AbstractStatefulRequestAction<ActionSettings, 'StudioModeStateChanged'> {
	private _status: boolean[] = new Array(sockets.length).fill(false);

	constructor() {
		super('dev.theca11.multiobs.triggerstudiomodetransition', { statusEvent: 'StudioModeStateChanged' });
		this._showSuccess = true; // force showing success icon

		sockets.forEach((socket, socketIdx) => {
			socket.on('StudioModeStateChanged', ({ studioModeEnabled }) => {
				this._status[socketIdx] = studioModeEnabled;
			});
		});
	}

	override getPayloadFromSettings(): SingleRequestPayload<'TriggerStudioModeTransition'> {
		return { requestType: 'TriggerStudioModeTransition' };
	}

	override async onSocketConnected(socketIdx: number): Promise<void> {
		const { studioModeEnabled } = await sockets[socketIdx].call('GetStudioModeEnabled');
		this._status[socketIdx] = studioModeEnabled;
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this._status[socketIdx] = false;
	}

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		return this._status[socketIdx] ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	override getStateFromEvent(evtData: { studioModeEnabled: boolean; }): StateEnum {
		return evtData.studioModeEnabled ? StateEnum.Active : StateEnum.Inactive;
	}
}
