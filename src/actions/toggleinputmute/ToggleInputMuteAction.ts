import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getInputsLists } from '../lists';
import { Input, SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { inputName: string }
export class ToggleInputMuteAction extends AbstractStatefulRequestAction<ActionSettings, 'InputMuteStateChanged'> {
	constructor() {
		super('dev.theca11.multiobs.toggleinputmute', { titleParam: 'inputName', statusEvent: 'InputMuteStateChanged' });
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'SetInputMute' | 'ToggleInputMute'> {
		const { inputName } = settings;
		if (desiredState === 0 || desiredState === 1) {
			return {
				requestType: 'SetInputMute',
				requestData: {
					inputName: inputName,
					inputMuted: desiredState === 0,
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

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const { inputName } = socketSettings;
		if (!inputName) return StateEnum.Inactive;
		const { inputMuted } = await sockets[socketIdx].call('GetInputMute', { inputName });
		return !inputMuted ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(evtData: { inputName: string; inputMuted: boolean; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return socketSettings.inputName === evtData.inputName;
	}

	override getStateFromEvent(evtData: { inputName: string; inputMuted: boolean; }): StateEnum {
		return !evtData.inputMuted ? StateEnum.Active : StateEnum.Inactive;
	}
}
