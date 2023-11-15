import { sockets } from '../../plugin/sockets';
import { secondsToTimecode } from '../../plugin/utils';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { ContextData, SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { showTime: string }

export class ToggleStreamAction extends AbstractStatefulRequestAction<ActionSettings, 'StreamStateChanged'> {
	private _status: ('on' | 'reconnecting' | 'off')[] = new Array(sockets.length).fill('off');
	private _startTimestamp: number[] = new Array(sockets.length).fill(0);
	private _timerInterval: NodeJS.Timeout | undefined;

	constructor() {
		super('dev.theca11.multiobs.togglestream', { statusEvent: 'StreamStateChanged', statesColors: { on: '#5a9b4a' } });
		this._attachListenersForTimer();
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'StartStream' | 'StopStream' | 'ToggleStream'> {
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

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const status = this._status[socketIdx];
		return status === 'reconnecting' ? StateEnum.Intermediate : status === 'on' ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	override getStateFromEvent(evtData: { outputActive: boolean; outputState: string; }): StateEnum {
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

	override async onSocketConnected(socketIdx: number): Promise<void> {
		const { outputActive, outputReconnecting, outputDuration } = await sockets[socketIdx].call('GetStreamStatus');
		this._status[socketIdx] = outputReconnecting ? 'reconnecting' : outputActive ? 'on' : 'off';
		this._startTimestamp[socketIdx] = outputReconnecting || outputActive ? Date.now() - outputDuration : 0;
		this._updateTimer();
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this._status[socketIdx] = 'off';
		this._updateTimer();
	}

	override async onContextAppear(context: string, contextData: ContextData<ActionSettings>): Promise<void> {
		this._setTimerTitle(context, contextData.settings);
	}

	override async onContextSettingsUpdated(context: string, contextData: ContextData<ActionSettings>): Promise<void> {
		this._setTimerTitle(context, contextData.settings);
	}

	private _attachListenersForTimer() {
		sockets.forEach((socket, socketIdx) => {
			socket.on('StreamStateChanged', ({ outputState }) => {
				if (outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
					this._status[socketIdx] = 'on';
					this._startTimestamp[socketIdx] = Date.now();
				}
				else if (outputState === 'OBS_WEBSOCKET_OUTPUT_RECONNECTED') {
					this._status[socketIdx] = 'on';
				}
				else if (outputState === 'OBS_WEBSOCKET_OUTPUT_RECONNECTING') {
					this._status[socketIdx] = 'reconnecting';
				}
				else {
					this._status[socketIdx] = 'off';
				}
				this._updateTimer();
			});
		});
	}

	private _updateTimer() {
		if (this._status.every(s => s === 'off')) {
			clearInterval(this._timerInterval);
			this._timerInterval = undefined;
			for (const [context, { settings }] of this.contexts) {
				this._setTimerTitle(context, settings);
			}
		}
		else if (!this._timerInterval) {
			this._timerInterval = setInterval(() => {
				for (const [context, { settings }] of this.contexts) {
					this._setTimerTitle(context, settings);
				}
			}, 1000);
		}
	}

	private _setTimerTitle(context: string, settings: (SocketSettings<ActionSettings> | null)[]) {
		const title = settings
		.map((socketSettings, socketIdx) => {
			if (!socketSettings?.showTime) return;
			if (this._status[socketIdx] === 'on' || this._status[socketIdx] === 'reconnecting') {
				return secondsToTimecode((Date.now() - this._startTimestamp[socketIdx]) / 1000);
			}
			return secondsToTimecode(0);
		})
		.filter(t => t)
		.join('\n');
		$SD.setTitle(context, title);
	}
}
