import { OBSWebsocketAction } from '../OBSWebsocketAction.js';
import { getScenesLists } from '../../helpersOBS.js';

export class SetSceneAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.setscene', 'sceneName');
	}

	getPayloadFromSettings(settings) {
		const { sceneName } = settings;
		return {
			requestType: 'SetCurrentProgramScene',
			requestData: { sceneName: sceneName },
		};
	}

	async onPropertyInspectorReady({context, action}) {
		const scenesLists = await getScenesLists();
		const payload = { event: 'SceneListLoaded', scenesLists: scenesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}
}