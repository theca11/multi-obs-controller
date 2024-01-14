import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = Record<string, never>

export class SaveReplayBufferAction extends AbstractStatefulRequestAction<ActionSettings, 'ReplayBufferStateChanged'> {
	private _status: boolean[] = new Array(sockets.length).fill(false);

	constructor() {
		super('dev.theca11.multiobs.savereplaybuffer', { statusEvent: 'ReplayBufferStateChanged' });
		this._showSuccess = true; // force showing success icon

		sockets.forEach((socket, socketIdx) => {
			socket.on('ReplayBufferStateChanged', ({ outputActive }) => {
				this._status[socketIdx] = outputActive;
			});
		});
	}

	override getPayloadFromSettings(): SingleRequestPayload<'SaveReplayBuffer'> {
		return { requestType: 'SaveReplayBuffer' };
	}

	override async onSocketConnected(socketIdx: number): Promise<void> {
		const { outputActive } = await sockets[socketIdx].call('GetReplayBufferStatus');
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

	override getStateFromEvent(evtData: { outputActive: boolean; }): StateEnum {
		return evtData.outputActive ? StateEnum.Active : StateEnum.Inactive;
	}
}