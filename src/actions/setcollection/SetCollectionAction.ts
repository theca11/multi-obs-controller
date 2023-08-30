import { AbstractStatelessWsAction } from '../AbstractStatelessWsAction';
import { getCollectionsLists } from '../lists';

export class SetCollectionAction extends AbstractStatelessWsAction {	// to-do: fix this, it's stateful
	constructor() {
		super('dev.theca11.multiobs.setcollection', { titleParam: 'sceneCollectionName' });
	}

	getPayloadFromSettings(settings: any) {
		const { sceneCollectionName } = settings;
		return {
			requestType: 'SetCurrentSceneCollection',
			requestData: { sceneCollectionName: sceneCollectionName },
		};
	}

	async onPropertyInspectorReady({ context, action }: {context: string, action: string}) {
		const collectionsLists = await getCollectionsLists();
		const payload = { event: 'CollectionListLoaded', collectionsLists: collectionsLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}
}