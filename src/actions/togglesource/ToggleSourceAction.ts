import { OBSResponseTypes } from 'obs-websocket-js';
import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getScenesLists, getSceneItemsList } from '../lists';
import { SocketSettings, BatchRequestPayload, SendToPluginData } from '../types';

type ActionSettings = { sceneName: string, sourceName: string }

export class ToggleSourceAction extends AbstractStatefulRequestAction<ActionSettings, 'SceneItemEnableStateChanged'> {
	constructor() {
		super('dev.theca11.multiobs.togglesource', { titleParam: 'sourceName', statusEvent: 'SceneItemEnableStateChanged' });

		this.onSendToPlugin(async ({ payload, context, action }: SendToPluginData<{ event: string, socketIdx: number, sceneName: string }>) => {
			if (payload.event === 'GetSceneItemsList') {
				const sceneItems = await getSceneItemsList(payload.socketIdx, payload.sceneName);
				const piPayload = {
					event: 'SourceListLoaded',
					idx: payload.socketIdx,
					sourceList: sceneItems.map(o => o.sourceName),
				};
				$SD.sendToPropertyInspector(context, piPayload, action);
			}
		});

		// Refetch states on scene collection changed, since source-specific events are not emitted
		sockets.forEach((socket, socketIdx) => {
			socket.on('CurrentSceneCollectionChanged', async () => {
				for (const [context, { settings, states }] of this.contexts) {
					if (!settings[socketIdx]) return;
					const newState = await this.fetchState(settings[socketIdx]!, socketIdx).catch(() => StateEnum.Unavailable);
					if (newState !== states[socketIdx]) {
						this.setContextSocketState(context, socketIdx, newState);
						this.updateKeyImage(context);
					}
				}
			});
		});
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): BatchRequestPayload {
		const { sceneName, sourceName } = settings;
		return {
			requests: [
				{
					requestType: 'GetSceneItemId',
					requestData: { sceneName: sceneName, sourceName: sourceName },
					outputVariables: { sceneItemIdVariable: 'sceneItemId' },
				},
				{
					requestType: 'SetSceneItemEnabled',
					requestData: {
						sceneName: sceneName,
						sceneItemEnabled: desiredState !== undefined ? !desiredState : state !== StateEnum.Active,
					},
					inputVariables: { sceneItemId: 'sceneItemIdVariable' },
				},
			],
		};
	}

	override async onPropertyInspectorReady({ context, action }: { context: string; action: string; }): Promise<void> {
		const scenesLists = await getScenesLists();
		const payload = { event: 'SceneListLoaded', scenesLists: scenesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const { sceneName, sourceName } = socketSettings;
		if (!sceneName || !sourceName) return StateEnum.Inactive;

		const requestResults = await sockets[socketIdx].callBatch([
			{
				requestType: 'GetSceneItemId',
				requestData: { sceneName, sourceName },
				// @ts-expect-error ouputVariables is not typed in obswebsocketjs (https://github.com/obs-websocket-community-projects/obs-websocket-js/issues/313)
				outputVariables: { sceneItemIdVariable: 'sceneItemId' },
			},
			{
				requestType: 'GetSceneItemEnabled',
				// @ts-expect-error ouputVariables is not typed in obswebsocketjs (https://github.com/obs-websocket-community-projects/obs-websocket-js/issues/313)
				requestData: { sceneName },
				inputVariables: { sceneItemId: 'sceneItemIdVariable' },
			},
		]);
		const enabled = (requestResults.at(-1)?.responseData as OBSResponseTypes['GetSceneItemEnabled']).sceneItemEnabled;
		return enabled ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(evtData: { sceneName: string; sceneItemId: number; sceneItemEnabled: boolean; }, socketSettings: SocketSettings<ActionSettings>, socketIdx: number): Promise<boolean> {
		const { sceneName, sourceName } = socketSettings;
		if (sceneName && sourceName && sceneName === evtData.sceneName) {
			const { sceneItemId } = await sockets[socketIdx].call('GetSceneItemId', { sceneName, sourceName });
			if (sceneItemId && sceneItemId === evtData.sceneItemId) return true;
		}
		return false;
	}

	override getStateFromEvent(evtData: { sceneName: string; sceneItemId: number; sceneItemEnabled: boolean; }): StateEnum {
		return evtData.sceneItemEnabled ? StateEnum.Active : StateEnum.Inactive;
	}
}
