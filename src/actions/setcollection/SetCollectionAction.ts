import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { SocketSettings } from '../types';
import { StateEnum } from '../StateEnum';
import { getCollectionsLists } from '../lists';
import { SingleRequestPayload } from '../types';
import { sockets } from '../../plugin/sockets';

type ActionSettings = { sceneCollectionName: string }

export class SetCollectionAction extends AbstractStatefulRequestAction<ActionSettings, 'CurrentSceneCollectionChanged'> {
	constructor() {
		super('dev.theca11.multiobs.setcollection', { titleParam: 'sceneCollectionName', statusEvent: 'CurrentSceneCollectionChanged' });
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SetCurrentSceneCollection'> {
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

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		if (!socketSettings.sceneCollectionName) return StateEnum.Inactive;
		const { currentSceneCollectionName } = await sockets[socketIdx].call('GetSceneCollectionList');
		return socketSettings.sceneCollectionName === currentSceneCollectionName ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(evtData: { sceneCollectionName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return socketSettings.sceneCollectionName ? true : false;
	}

	getStateFromEvent(evtData: { sceneCollectionName: string; }, socketSettings: SocketSettings<ActionSettings>): StateEnum {
		return evtData.sceneCollectionName === socketSettings.sceneCollectionName ? StateEnum.Active : StateEnum.Inactive;
	}
}