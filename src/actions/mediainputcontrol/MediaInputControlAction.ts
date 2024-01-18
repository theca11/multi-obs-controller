import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getInputsLists } from '../lists';
import { SocketSettings, SingleRequestPayload, Input } from '../types';

type ActionSettings = { inputName: string, action: 'play_stop' | 'play_pause' | 'restart' | 'stop' }

export class MediaInputControlAction extends AbstractStatefulRequestAction<ActionSettings, 'MediaInputPlaybackStarted' | 'MediaInputPlaybackEnded'> {

	constructor() {
		super('dev.theca11.multiobs.mediainputcontrol', {
			titleParam: 'inputName',
			statusEvent: ['MediaInputPlaybackStarted', 'MediaInputPlaybackEnded', 'MediaInputActionTriggered'],
		});
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'TriggerMediaInputAction'> {
		let action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE';
		if (desiredState === 0) {
			action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY';
		}
		else if (desiredState === 1 || settings.action === 'stop') {
			action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP';
		}
		else if (desiredState === 2) {
			action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE';
		}
		else if (desiredState === 3 || settings.action === 'restart') {
			action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART';
		}
		else if (settings.action === 'play_stop') {
			action = state === StateEnum.Active ? 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP' : state === StateEnum.Intermediate ? 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY' : 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART';
		}
		else if (settings.action === 'play_pause') {
			action = state === StateEnum.Active ? 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE' : state === StateEnum.Intermediate ? 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY' : 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART';
		}
		return { requestType: 'TriggerMediaInputAction', requestData: { inputName: settings.inputName, mediaAction: action } };
	}

	override async onPropertyInspectorReady({ context, action }: { context: string; action: string; }): Promise<void> {
		const inputsLists = await getInputsLists() as Input[][];
		const payload = {
			event: 'InputListLoaded',
			inputsLists: inputsLists.map((list) =>
				list.filter((i) => i.unversionedInputKind === 'ffmpeg_source'),
			),
		};
		$SD.sendToPropertyInspector(context, payload, action);
	}

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const { inputName } = socketSettings;
		if (!inputName) return StateEnum.Inactive;
		const { mediaState } = await sockets[socketIdx].call('GetMediaInputStatus', { inputName });
		switch (mediaState) {
			case 'OBS_MEDIA_STATE_PLAYING':
				return StateEnum.Active;
			case 'OBS_MEDIA_STATE_OPENING':
			case 'OBS_MEDIA_STATE_BUFFERING':
			case 'OBS_MEDIA_STATE_PAUSED':
				return StateEnum.Intermediate;
			case 'OBS_MEDIA_STATE_NONE':
			case 'OBS_MEDIA_STATE_STOPPED':
			case 'OBS_MEDIA_STATE_ENDED':
			case 'OBS_MEDIA_STATE_ERROR':
				return StateEnum.Inactive;
			default:
				return StateEnum.Inactive;
		}
	}

	override async shouldUpdateState(evtData: { inputName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return socketSettings.inputName === evtData.inputName;
	}

	override getStateFromEvent(evtData: { inputName: string; mediaAction: string; }, socketSettings: SocketSettings<ActionSettings>, eventName: 'MediaInputPlaybackStarted' | 'MediaInputPlaybackEnded' | 'MediaInputActionTriggered'): StateEnum {
		if (eventName === 'MediaInputPlaybackStarted') {
			return StateEnum.Active;
		}
		else if (eventName === 'MediaInputPlaybackEnded') {
			return StateEnum.Inactive;
		}
		else if (eventName === 'MediaInputActionTriggered') {
			switch (evtData.mediaAction) {
				case 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY':
				case 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART':
					return StateEnum.Active;
				case 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE':
					return StateEnum.Intermediate;
				case 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE':
				case 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP':
					return StateEnum.Inactive;
				default:
					return StateEnum.Inactive;
			}
		}
		return StateEnum.Inactive;
	}
}