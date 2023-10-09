import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { SocketSettings } from '../types';
import { StateEnum } from '../StateEnum';
import { getInputsLists } from '../lists';
import { SingleRequestPayload } from '../types';
import { sockets } from '../../plugin/sockets';

type ActionSettings = { inputName: string }
type Input = { inputName: string, inputKind: string, unversionedInputKind: string };

export class ToggleInputMuteAction extends AbstractStatefulRequestAction<ActionSettings, 'InputMuteStateChanged'> {
	constructor() {
		super('dev.theca11.multiobs.toggleinputmute', { titleParam: 'inputName', statusEvent: 'InputMuteStateChanged' });
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>, desiredState?: number | undefined): SingleRequestPayload<'SetInputMute' | 'ToggleInputMute'> {
		const { inputName } = settings;
		if (desiredState === 0 || desiredState === 1) {
			return {
				requestType: 'SetInputMute',
				requestData: {
					inputName: inputName,
					inputMuted: desiredState === 0 ? true : false,
				},
			};
		}
		else {
			return { requestType: 'ToggleInputMute', requestData: { inputName: inputName } };
		}
	}

	override async onPropertyInspectorReady({ context, action }: { context: string; action: string; }): Promise<void> {
		const inputsLists = await getInputsLists() as Input[][];
		const payload = {
			event: 'InputListLoaded',
			inputsLists: inputsLists.map((list) =>
				list.filter((i) => ['dshow_input', 'wasapi_input_capture', 'wasapi_output_capture'].includes(i.unversionedInputKind)),
			),
		};
		$SD.sendToPropertyInspector(context, payload, action);
	}

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const { inputName } = socketSettings;
		if (!inputName) return StateEnum.Inactive;
		const { inputMuted } = await sockets[socketIdx].call('GetInputMute', { inputName });
		return !inputMuted ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(evtData: { inputName: string; inputMuted: boolean; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return socketSettings.inputName === evtData.inputName ? true : false;
	}

	getStateFromEvent(evtData: { inputName: string; inputMuted: boolean; }): StateEnum {
		return !evtData.inputMuted ? StateEnum.Active : StateEnum.Inactive;
	}
}
