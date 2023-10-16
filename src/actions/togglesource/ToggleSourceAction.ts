import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { SocketSettings } from '../types';
import { StateEnum } from '../StateEnum';
import { getScenesLists, getSceneItemsList } from '../lists';
import { BatchRequestPayload, SendToPluginData } from '../types';
import { sockets } from '../../plugin/sockets';
import { OBSResponseTypes } from 'obs-websocket-js';

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
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>, socketIdx: number, desiredState?: number | undefined): BatchRequestPayload {
		const { sceneName, sourceName } = settings;
		if (desiredState === 0 || desiredState === 1) {
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
							sceneItemEnabled: desiredState === 0 ? true : false,
						},
						inputVariables: { sceneItemId: 'sceneItemIdVariable' },
					},
				],
			};
		}
		else {
			return {
				requests: [
					{
						requestType: 'GetSceneItemId',
						requestData: { sceneName: sceneName, sourceName: sourceName },
						outputVariables: { sceneItemIdVariable: 'sceneItemId' },
					},
					{
						requestType: 'GetSceneItemEnabled',
						requestData: { sceneName: sceneName },
						inputVariables: { sceneItemId: 'sceneItemIdVariable' },
					},
				],
			};
		}
	}

	override async sendWsRequests(payloadsArray: (BatchRequestPayload | null)[]): Promise<PromiseSettledResult<any>[]> {
		const requestType = payloadsArray.find(payload => payload)?.requests[1].requestType;
		if (requestType === 'SetSceneItemEnabled') { return super.sendWsRequests(payloadsArray); }

		const sceneNames = payloadsArray.map((p) => p ? p.requests[0].requestData.sceneName : null);
		const firstBatchResults = await super.sendWsRequests(payloadsArray);
		const secondBatchPayloadsArray = firstBatchResults.flat().map((r, idx) => {
			if (!payloadsArray[idx]) {
				return null;
			}
			const obsResponse = (r as PromiseFulfilledResult<any>).value;
			if (obsResponse) {
				const sceneItemId = obsResponse[0].responseData?.sceneItemId;
				const sceneItemEnabled = obsResponse[1].responseData?.sceneItemEnabled;
				return {
					requestType: 'SetSceneItemEnabled',
					requestData: {
						sceneName: sceneNames[idx],
						sceneItemId: sceneItemId,
						sceneItemEnabled: !sceneItemEnabled,
					},
				};
			}
			else {
				return { requestType: 'InvalidRequest', requestData: {} };
			}
		});
		return super.sendWsRequests(secondBatchPayloadsArray);
	}

	override async onPropertyInspectorReady({ context, action }: { context: string; action: string; }): Promise<void> {
		const scenesLists = await getScenesLists();
		const payload = { event: 'SceneListLoaded', scenesLists: scenesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
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

	async shouldUpdateState(evtData: { sceneName: string; sceneItemId: number; sceneItemEnabled: boolean; }, socketSettings: SocketSettings<ActionSettings>, socketIdx: number): Promise<boolean> {
		const { sceneName, sourceName } = socketSettings;
		if (sceneName && sourceName && sceneName === evtData.sceneName) {
			const { sceneItemId } = await sockets[socketIdx].call('GetSceneItemId', { sceneName, sourceName });
			if (sceneItemId && sceneItemId === evtData.sceneItemId) return true;
		}
		return false;
	}

	getStateFromEvent(evtData: { sceneName: string; sceneItemId: number; sceneItemEnabled: boolean; }): StateEnum {
		return evtData.sceneItemEnabled ? StateEnum.Active : StateEnum.Inactive;
	}
}
