import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getCollectionsLists } from '../lists';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { sceneCollectionName: string }

export class SetCollectionAction extends AbstractStatefulRequestAction<ActionSettings, 'CurrentSceneCollectionChanged'> {
	private _currentSceneCollectionName = new Array(sockets.length).fill(null);

	constructor() {
		super('dev.theca11.multiobs.setcollection', { titleParam: 'sceneCollectionName', statusEvent: 'CurrentSceneCollectionChanged' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('CurrentSceneCollectionChanged', ({ sceneCollectionName }) => {
				this._currentSceneCollectionName[socketIdx] = sceneCollectionName;
			});

			socket.on('CurrentSceneCollectionChanging', () => {
				for (const [context, { settings }] of this.contexts) {
					if (!settings[socketIdx]) return;
					this.setContextSocketState(context, socketIdx, StateEnum.Intermediate);
					this.updateKeyImage(context);
				}
			});
		});
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SetCurrentSceneCollection'> {
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

	override async onSocketConnected(socketIdx: number): Promise<void> {
		const { currentSceneCollectionName } = await sockets[socketIdx].call('GetSceneCollectionList');
		this._currentSceneCollectionName[socketIdx] = currentSceneCollectionName;
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this._currentSceneCollectionName[socketIdx] = null;
	}

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		if (!socketSettings.sceneCollectionName) return StateEnum.Inactive;
		return socketSettings.sceneCollectionName === this._currentSceneCollectionName[socketIdx] ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(evtData: { sceneCollectionName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return !!socketSettings.sceneCollectionName;
	}

	override getStateFromEvent(evtData: { sceneCollectionName: string; }, socketSettings: SocketSettings<ActionSettings>): StateEnum {
		return evtData.sceneCollectionName === socketSettings.sceneCollectionName ? StateEnum.Active : StateEnum.Inactive;
	}
}