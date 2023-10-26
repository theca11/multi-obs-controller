import { sockets } from '../../plugin/sockets';
import { secondsToTimecode } from '../../plugin/utils';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { ContextData, SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { showTime: string }

export class ToggleRecordAction extends AbstractStatefulRequestAction<ActionSettings, 'RecordStateChanged'> {
	private _status: ('on' | 'paused' | 'off')[] = new Array(sockets.length).fill('off');
	private _startTimestamp: number[] = new Array(sockets.length).fill(0);
	private _pauseTimestamp: number[] = new Array(sockets.length).fill(0);
	private _timerInterval: NodeJS.Timeout | undefined;

	constructor() {
		super('dev.theca11.multiobs.togglerecord', { statusEvent: 'RecordStateChanged', statesColors: { on: '#cc3636' } });
		this._attachListenersForTimer();
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'StartRecord' | 'StopRecord' | 'ToggleRecord'> {
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

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const status = this._status[socketIdx];
		return status === 'paused' ? StateEnum.Intermediate : status === 'on' ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(): Promise<boolean> {
		return true;
	}

	override getStateFromEvent(evtData: { outputActive: boolean; outputState: string; outputPath: string; }): StateEnum {
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
			this._status[socketIdx] = outputPaused ? 'paused' : outputActive ? 'on' : 'off';
			this._startTimestamp[socketIdx] = outputPaused || outputActive ? Date.now() - outputDuration : 0;
			this._pauseTimestamp[socketIdx] = outputPaused ? Date.now() : 0;
		}
		catch {
			this._status[socketIdx] = 'off';
		}
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
			socket.on('RecordStateChanged', ({ outputState }) => {
				if (outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
					this._status[socketIdx] = 'on';
					this._startTimestamp[socketIdx] = Date.now();
				}
				else if (outputState === 'OBS_WEBSOCKET_OUTPUT_RESUMED') {
					this._status[socketIdx] = 'on';
					this._startTimestamp[socketIdx] += Date.now() - this._pauseTimestamp[socketIdx];
				}
				else if (outputState === 'OBS_WEBSOCKET_OUTPUT_PAUSED') {
					this._status[socketIdx] = 'paused';
					this._pauseTimestamp[socketIdx] = Date.now();
				}
				else {
					this._status[socketIdx] = 'off';
				}
				this._updateTimer();
			});
		});
	}

	private _updateTimer() {
		if (this._status.every(s => s !== 'on')) {
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
			if (this._status[socketIdx] === 'on') {
				return secondsToTimecode((Date.now() - this._startTimestamp[socketIdx]) / 1000);
			}
			else if (this._status[socketIdx] === 'paused') {
				return secondsToTimecode((this._pauseTimestamp[socketIdx] - this._startTimestamp[socketIdx]) / 1000);
			}
			return secondsToTimecode(0);
		})
		.filter(t => t)
		.join('\n');
		$SD.setTitle(context, title);
	}
}
