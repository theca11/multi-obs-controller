import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getCollectionsLists } from '../lists';
import { getCurrentSceneCollection } from '../states';

export class SetCollectionAction extends AbstractStatefulRequestAction {
	constructor() {
		super('dev.theca11.multiobs.setcollection', { titleParam: 'sceneCollectionName', statusEvent: 'CurrentSceneCollectionChanged' });
	}

	getPayloadFromSettings(settings: any) {
		const { sceneCollectionName } = settings;
		return {
			requestType: 'SetCurrentSceneCollection',
			requestData: { sceneCollectionName: sceneCollectionName },
		};
	}

	override async onPropertyInspectorReady({ context, action }: { context: string, action: string }) {
		const collectionsLists = await getCollectionsLists();
		const payload = { event: 'CollectionListLoaded', collectionsLists: collectionsLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<StateEnum.Active | StateEnum.Inactive> {
		const currentSceneCollection = getCurrentSceneCollection(socketIdx);
		return socketSettings.sceneCollectionName && socketSettings.sceneCollectionName === currentSceneCollection ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(evtData: any, socketSettings: any): Promise<boolean> {
		const { sceneCollectionName } = socketSettings;
		if (sceneCollectionName) return true;
		return false;
	}

	async getStateFromEvent(evtData: any, socketSettings: any): Promise<StateEnum> {
		return evtData.sceneCollectionName === socketSettings.sceneCollectionName ? StateEnum.Active : StateEnum.Inactive;
	}
}