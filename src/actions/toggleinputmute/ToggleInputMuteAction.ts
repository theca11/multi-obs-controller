import { OBSWebsocketAction } from '../OBSWebsocketAction';
import { getInputsLists } from '../helpersOBS';
import { getInputMuteState } from '../status';

export class ToggleInputMuteAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.toggleinputmute', { titleParam: 'inputName', statusEvent: 'InputMuteStateChanged' });
	}

	getPayloadFromSettings(settings: any, desiredState?: number | undefined) {
		const { inputName } = settings;
		if (desiredState === 0 || desiredState === 1) {
			return {
				requestType: 'SetInputMute',
				requestData: {
					inputName: inputName,
					inputMuted: desiredState === 0 ? true : false,
				},
			};
		} else {
			return { requestType: 'ToggleInputMute', requestData: { inputName: inputName } };
		}
	}

	async onPropertyInspectorReady({ context, action }: { context: string; action: string; }): Promise<void> {
		const inputsLists = await getInputsLists();
		const payload = {
			event: 'InputListLoaded',
			inputsLists: inputsLists.map(list =>
				list.filter(i => ['dshow_input', 'wasapi_input_capture', 'wasapi_output_capture'].includes((i as unknown as any).unversionedInputKind)) // to-do: check this typing
			)
		};
		$SD.sendToPropertyInspector(context, payload, action);
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<boolean | null | undefined> {
		return !getInputMuteState(socketIdx, socketSettings.inputName);
	}

	// async getStates(settings) {
	// 	const settingsArray = this.getSettingsArray(settings);
	// 	return getInputMuteState(settingsArray.map(s => s?.inputName ?? null));
	// }

	async shouldUpdateImage(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean> {
		const { inputName } = socketSettings ;
		if (inputName && inputName === evtData.inputName) return true;
		return false;
	}

	async getNewState(evtData: any, socketSettings: any): Promise<boolean> {
		return !evtData.inputMuted;
	}
}
