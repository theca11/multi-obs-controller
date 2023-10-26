import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = Record<string, never>

export class ToggleStudioModeAction extends AbstractStatefulRequestAction<ActionSettings, 'StudioModeStateChanged'> {
	private _status: boolean[] = new Array(sockets.length).fill(false);

	constructor() {
		super('dev.theca11.multiobs.togglestudiomode', { statusEvent: 'StudioModeStateChanged' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('StudioModeStateChanged', ({ studioModeEnabled }) => {
				this._status[socketIdx] = studioModeEnabled;
			});
		});
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'SetStudioModeEnabled'> {
		if (desiredState === 0) {
			return { requestType: 'SetStudioModeEnabled', requestData: { studioModeEnabled: true } };
		}
		else if (desiredState === 1) {
			return { requestType: 'SetStudioModeEnabled', requestData: { studioModeEnabled: false } };
		}
		else {
			return { requestType: 'SetStudioModeEnabled', requestData: { studioModeEnabled: state !== StateEnum.Active } };
		}
	}

	override async onSocketConnected(socketIdx: number): Promise<void> {
		try {
			const { studioModeEnabled } = await sockets[socketIdx].call('GetStudioModeEnabled');
			this._status[socketIdx] = studioModeEnabled;
		}
		catch {
			this._status[socketIdx] = false;
		}
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
