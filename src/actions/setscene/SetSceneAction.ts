import { OBSWebsocketAction } from '../OBSWebsocketAction';
import { getScenesLists } from '../helpersOBS';
import { evtEmitter, getCurrentScenes } from '../status';

export class SetSceneAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.setscene', { titleParam: 'sceneName', statusEvent: 'CurrentProgramSceneChanged' });
	}

	getPayloadFromSettings(settings: any) {
		const { sceneName } = settings;
		return {
			requestType: 'SetCurrentProgramScene',
			requestData: { sceneName: sceneName },
		};
	}

	async onPropertyInspectorReady({context, action}: {context: string, action: string}) {
		const scenesLists = await getScenesLists();
		const payload = { event: 'SceneListLoaded', scenesLists: scenesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<boolean | null | undefined> {
		const currentScene = getCurrentScenes()[socketIdx];
		return socketSettings.sceneName && socketSettings.sceneName === currentScene;
	}

	// async getStates(settings) {
	// 	let states = [null, null];
	// 	const currentScenes = getCurrentScenes();
	// 	const settingsArray = this.getSettingsArray(settings);
	// 	for (let i = 0; i < currentScenes.length; i++) {
	// 		if (currentScenes[i]) {
	// 			states[i] = currentScenes[i] === settingsArray[i]?.sceneName;
	// 		}
	// 	}
	// 	return states;
	// }

	async shouldUpdateImage(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean> {
		const { sceneName } = socketSettings;
		if (sceneName) return true;
		return false;
	}

	async getNewState(evtData: any, socketSettings: any): Promise<boolean> {
		return evtData.sceneName === socketSettings.sceneName;
	}
}