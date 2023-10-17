import { sockets } from '../../plugin/sockets';
import { secondsToTimecode } from '../../plugin/utils';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { ContextData, SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { showTime: string }

export class ToggleRecordAction extends AbstractStatefulRequestAction<ActionSettings, 'RecordStateChanged'> {
	status: ('on' | 'paused' | 'off')[] = new Array(sockets.length).fill('off');
	startTimestamp: number[] = new Array(sockets.length).fill(0);
	pauseTimestamp: number[] = new Array(sockets.length).fill(0);
	timerInterval: NodeJS.Timeout | undefined;

	constructor() {
		super('dev.theca11.multiobs.togglerecord', { statusEvent: 'RecordStateChanged', statesColors: { on: '#cc3636' } });
		this.attachListenersForTimer();
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'StartRecord' | 'StopRecord' | 'ToggleRecord'> {
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
		const status = this.status[socketIdx];
		return status === 'paused' ? StateEnum.Intermediate : status === 'on' ? StateEnum.Active : StateEnum.Inactive;
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

	override async onSocketConnected(socketIdx: number): Promise<void> {
		try {
			const { outputActive, outputPaused, outputDuration } = await sockets[socketIdx].call('GetRecordStatus');
			this.status[socketIdx] = outputPaused ? 'paused' : outputActive ? 'on' : 'off';
			this.startTimestamp[socketIdx] = outputPaused || outputActive ? Date.now() - outputDuration : 0;
			this.pauseTimestamp[socketIdx] = outputPaused ? Date.now() : 0;
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
			socket.on('RecordStateChanged', ({ outputState }) => {
				if (outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
					this.status[socketIdx] = 'on';
					this.startTimestamp[socketIdx] = Date.now();
				}
				else if (outputState === 'OBS_WEBSOCKET_OUTPUT_RESUMED') {
					this.status[socketIdx] = 'on';
					this.startTimestamp[socketIdx] += Date.now() - this.pauseTimestamp[socketIdx];
				}
				else if (outputState === 'OBS_WEBSOCKET_OUTPUT_PAUSED') {
					this.status[socketIdx] = 'paused';
					this.pauseTimestamp[socketIdx] = Date.now();
				}
				else {
					this.status[socketIdx] = 'off';
				}
				this.updateTimer();
			});
		});
	}

	updateTimer() {
		if (this.status.every(s => s !== 'on')) {
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
			if (this.status[socketIdx] === 'on') {
				return secondsToTimecode((Date.now() - this.startTimestamp[socketIdx]) / 1000);
			}
			else if (this.status[socketIdx] === 'paused') {
				return secondsToTimecode((this.pauseTimestamp[socketIdx] - this.startTimestamp[socketIdx]) / 1000);
			}
			return secondsToTimecode(0);
		})
		.filter(t => t)
		.join('\n');
		$SD.setTitle(context, title);
	}
}
