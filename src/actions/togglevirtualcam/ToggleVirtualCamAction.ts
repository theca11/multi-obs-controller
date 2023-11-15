import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = Record<string, never>

export class ToggleVirtualCamAction extends AbstractStatefulRequestAction<ActionSettings, 'VirtualcamStateChanged'> {
	private _status: boolean[] = new Array(sockets.length).fill(false);

	constructor() {
		super('dev.theca11.multiobs.togglevirtualcam', { statusEvent: 'VirtualcamStateChanged' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('VirtualcamStateChanged', ({ outputActive }) => {
				this._status[socketIdx] = outputActive;
			});
		});
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'StartVirtualCam' | 'StopVirtualCam' | 'ToggleVirtualCam'> {
		if (desiredState === 0) {
			return { requestType: 'StartVirtualCam' };
		}
		else if (desiredState === 1) {
			return { requestType: 'StopVirtualCam' };
		}
		else {
			return { requestType: 'ToggleVirtualCam' };
		}
	}

	override async onSocketConnected(socketIdx: number): Promise<void> {
		const { outputActive } = await sockets[socketIdx].call('GetVirtualCamStatus');
		this._status[socketIdx] = outputActive;
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

	override getStateFromEvent(evtData: { outputActive: boolean; outputState: string; }): StateEnum {
		return evtData.outputActive ? StateEnum.Active : StateEnum.Inactive;
	}
}
