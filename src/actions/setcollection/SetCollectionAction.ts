import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getCollectionsLists } from '../lists';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { sceneCollectionName: string }

export class SetCollectionAction extends AbstractStatefulRequestAction<ActionSettings, 'CurrentSceneCollectionChanged'> {
	currentSceneCollectionName = new Array(sockets.length).fill(null);

	constructor() {
		super('dev.theca11.multiobs.setcollection', { titleParam: 'sceneCollectionName', statusEvent: 'CurrentSceneCollectionChanged' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('CurrentSceneCollectionChanged', ({ sceneCollectionName }) => {
				this.currentSceneCollectionName[socketIdx] = sceneCollectionName;
			});

			socket.on('CurrentSceneCollectionChanging', async () => {
				for (const [context, { settings }] of this._contexts) {
					if (!settings[socketIdx]) return;
					this._setContextSocketState(context, socketIdx, StateEnum.Intermediate);
					this.updateKeyImage(context);
				}
			});
		});
	}

	getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SetCurrentSceneCollection'> {
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
		try {
			const { currentSceneCollectionName } = await sockets[socketIdx].call('GetSceneCollectionList');
			this.currentSceneCollectionName[socketIdx] = currentSceneCollectionName;
		}
		catch {
			this.currentSceneCollectionName[socketIdx] = null;
		}
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this.currentSceneCollectionName[socketIdx] = null;
	}

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		if (!socketSettings.sceneCollectionName) return StateEnum.Inactive;
		return socketSettings.sceneCollectionName === this.currentSceneCollectionName[socketIdx] ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(evtData: { sceneCollectionName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return socketSettings.sceneCollectionName ? true : false;
	}

	getStateFromEvent(evtData: { sceneCollectionName: string; }, socketSettings: SocketSettings<ActionSettings>): StateEnum {
		return evtData.sceneCollectionName === socketSettings.sceneCollectionName ? StateEnum.Active : StateEnum.Inactive;
	}
}