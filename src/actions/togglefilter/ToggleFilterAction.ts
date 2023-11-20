import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getInputsLists, getScenesLists, getSourceFilterList } from '../lists';
import { SocketSettings, SingleRequestPayload, SendToPluginData } from '../types';

type ActionSettings = { sourceName: string, filterName: string }

export class ToggleFilterAction extends AbstractStatefulRequestAction<ActionSettings, 'SourceFilterEnableStateChanged'> {
	constructor() {
		super('dev.theca11.multiobs.togglefilter', { titleParam: 'filterName', statusEvent: 'SourceFilterEnableStateChanged' });

		this.onSendToPlugin(async ({ payload, context, action }: SendToPluginData<{ event: string, socketIdx: number, sourceName: string }>) => {
			if (payload.event === 'GetSourceFilterList') {
				const filterItems = await getSourceFilterList(payload.socketIdx, payload.sourceName);
				const piPayload = {
					event: 'FilterListLoaded',
					idx: payload.socketIdx,
					filterList: filterItems.map(o => o.filterName),
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

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>, state: StateEnum, desiredState?: number | undefined): SingleRequestPayload<'SetSourceFilterEnabled'> {
		const { sourceName, filterName } = settings;
		return {
			requestType: 'SetSourceFilterEnabled',
			requestData: {
				sourceName: sourceName,
				filterName: filterName,
				filterEnabled: desiredState !== undefined ? !desiredState : state !== StateEnum.Active,
			},
		};
	}

	override async onPropertyInspectorReady({ context, action }: { context: string; action: string; }): Promise<void> {
		const scenesLists = await getScenesLists();
		const inputsLists = await getInputsLists();
		const payload = { event: 'SourceListLoaded', scenesLists, inputsLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		const { sourceName, filterName } = socketSettings;
		if (!sourceName || !filterName) return StateEnum.Inactive;
		const { filterEnabled } = await sockets[socketIdx].call('GetSourceFilter', { sourceName, filterName });
		return filterEnabled ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(evtData: { sourceName: string, filterName: string, filterEnabled: boolean; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return socketSettings.sourceName === evtData.sourceName && socketSettings.filterName === evtData.filterName;
	}

	override getStateFromEvent(evtData: { sourceName: string, filterName: string, filterEnabled: boolean; }): StateEnum {
		return evtData.filterEnabled ? StateEnum.Active : StateEnum.Inactive;
	}
}
