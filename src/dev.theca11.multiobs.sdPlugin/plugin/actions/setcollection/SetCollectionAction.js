import { OBSWebsocketAction } from '../OBSWebsocketAction.js';
import { getCollectionsLists } from '../../helpersOBS.js';

export class SetCollectionAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.setcollection', { titleParam: 'sceneCollectionName' });
	}

	getPayloadFromSettings(settings) {
		const { sceneCollectionName } = settings;
		return {
			requestType: 'SetCurrentSceneCollection',
			requestData: { sceneCollectionName: sceneCollectionName },
		};
	}

	async onPropertyInspectorReady({context, action}) {
		const collectionsLists = await getCollectionsLists();
		const payload = { event: 'CollectionListLoaded', collectionsLists: collectionsLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}
}