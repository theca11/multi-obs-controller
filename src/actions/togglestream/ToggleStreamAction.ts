import { sockets } from '../../plugin/sockets';
import { secondsToTimecode } from '../../plugin/utils';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { ContextData, SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { showTime: string }

export class ToggleStreamAction extends AbstractStatefulRequestAction<ActionSettings, 'StreamStateChanged'> {
	status: ('on' | 'reconnecting' | 'off')[] = new Array(sockets.length).fill('off');
	startTimestamp: number[] = new Array(sockets.length).fill(0);
	timerInterval: NodeJS.Timeout | undefined;

	constructor() {
		super('dev.theca11.multiobs.togglestream', { statusEvent: 'StreamStateChanged', statesColors: { on: '#5a9b4a' } });
		this.attachListenersForTimer();
	}

	getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'StartStream' | 'StopStream' | 'ToggleStream'> {
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
		const status = this.status[socketIdx];
		return status === 'reconnecting' ? StateEnum.Intermediate : status === 'on' ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	getStateFromEvent(evtData: { outputActive: boolean; outputState: string; }): StateEnum {
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
		try {
			const { outputActive, outputReconnecting, outputDuration } = await sockets[socketIdx].call('GetStreamStatus');
			this.status[socketIdx] = outputReconnecting ? 'reconnecting' : outputActive ? 'on' : 'off';
			this.startTimestamp[socketIdx] = outputReconnecting || outputActive ? Date.now() - outputDuration : 0;
		}
		catch {
			this.status[socketIdx] = 'off';
		}
		this.updateTimer();
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this.status[socketIdx] = 'off';
		this.updateTimer();
	}

	override async onContextAppear(context: string, contextData: ContextData<ActionSettings>): Promise<void> {
		this.setTimerTitle(context, contextData.settings);
	}

	override async onContextSettingsUpdated(context: string, contextData: ContextData<ActionSettings>): Promise<void> {
		this.setTimerTitle(context, contextData.settings);
	}

	attachListenersForTimer() {
		sockets.forEach((socket, socketIdx) => {
			socket.on('StreamStateChanged', ({ outputState }) => {
				if (outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
					this.status[socketIdx] = 'on';
					this.startTimestamp[socketIdx] = Date.now();
				}
				else if (outputState === 'OBS_WEBSOCKET_OUTPUT_RECONNECTED') {
					this.status[socketIdx] = 'on';
				}
				else if (outputState === 'OBS_WEBSOCKET_OUTPUT_RECONNECTING') {
					this.status[socketIdx] = 'reconnecting';
				}
				else {
					this.status[socketIdx] = 'off';
				}
				this.updateTimer();
			});
		});
	}

	updateTimer() {
		if (this.status.every(s => s === 'off')) {
			clearInterval(this.timerInterval);
			this.timerInterval = undefined;
			for (const [context, { settings }] of this._contexts) {
				this.setTimerTitle(context, settings);
			}
		}
		else if (!this.timerInterval) {
			this.timerInterval = setInterval(() => {
				for (const [context, { settings }] of this._contexts) {
					this.setTimerTitle(context, settings);
				}
			}, 1000);
		}
	}

	setTimerTitle(context: string, settings: (SocketSettings<ActionSettings> | null)[]) {
		const title = settings
		.map((socketSettings, socketIdx) => {
			if (!socketSettings?.showTime) return;
			if (this.status[socketIdx] === 'on' || this.status[socketIdx] === 'reconnecting') {
				return secondsToTimecode((Date.now() - this.startTimestamp[socketIdx]) / 1000);
			}
			return secondsToTimecode(0);
		})
		.filter(t => t)
		.join('\n');
		$SD.setTitle(context, title);
	}
}
