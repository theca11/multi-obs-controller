import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { SocketSettings, SingleRequestPayload } from '../types';
import { StateEnum } from '../StateEnum';

type ActionSettings = Record<string, never>

export class ToggleVirtualCamAction extends AbstractStatefulRequestAction<ActionSettings, 'VirtualcamStateChanged'> {
	status: boolean[] = new Array(sockets.length).fill(false);

	constructor() {
		super('dev.theca11.multiobs.togglevirtualcam', { statusEvent: 'VirtualcamStateChanged' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('VirtualcamStateChanged', ({ outputActive }) => {
				this.status[socketIdx] = outputActive;
			});
		});
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'StartVirtualCam' | 'StopVirtualCam' | 'ToggleVirtualCam'> {
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
		try {
			const { outputActive } = await sockets[socketIdx].call('GetVirtualCamStatus');
			this.status[socketIdx] = outputActive;
		}
		catch {
			this.status[socketIdx] = false;
		}
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this.status[socketIdx] = false;
	}

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		return this.status[socketIdx] ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	getStateFromEvent(evtData: { outputActive: boolean; outputState: string; }): StateEnum {
		return evtData.outputActive ? StateEnum.Active : StateEnum.Inactive;
	}
}
