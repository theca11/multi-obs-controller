import { OBSWebsocketAction } from '../OBSWebsocketAction.js';
import { getInputsLists } from '../../helpersOBS.js';

export class ToggleInputMuteAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.toggleinputmute', 'inputName');
	}

	getPayloadFromSettings(settings, desiredState) {
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

	async onPropertyInspectorReady({context, action}) {
		const inputsLists = await getInputsLists();
		const payload = {
			event: 'InputListLoaded',
			inputsLists: inputsLists.map(list =>
				list.filter(i => ['dshow_input', 'wasapi_input_capture', 'wasapi_output_capture'].includes(i.unversionedInputKind))
			)
		};
		$SD.sendToPropertyInspector(context, payload, action);
	}
}
