import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { SocketSettings } from '../types';
import { StateEnum } from '../StateEnum';
import { getScenesLists } from '../lists';
import { SingleRequestPayload } from '../types';

type ActionSettings = { sceneName: string }

export class SetSceneAction extends AbstractStatefulRequestAction<ActionSettings, 'CurrentProgramSceneChanged'> {
	constructor() {
		super('dev.theca11.multiobs.setscene', { titleParam: 'sceneName', statusEvent: 'CurrentProgramSceneChanged' });
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SetCurrentProgramScene'> {
		const { sceneName } = settings;
		return {
			requestType: 'SetCurrentProgramScene',
			requestData: { sceneName: sceneName },
		};
	}

	override async onPropertyInspectorReady({ context, action }: { context: string, action: string }) {
		const scenesLists = await getScenesLists();
		const payload = { event: 'SceneListLoaded', scenesLists: scenesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	// to-do: think if I can cache this info, since usually there are multiple Scene keys and fetching the current scene for each one is really redundant
	// not super important, since fetching is only done at startup ans OBS reconnect - later everything is event based right?
	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		if (!socketSettings.sceneName) return StateEnum.Inactive;
		const { currentProgramSceneName } = await sockets[socketIdx].call('GetCurrentProgramScene');
		return socketSettings.sceneName === currentProgramSceneName ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(evtData: { sceneName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return socketSettings.sceneName ? true : false;
	}

	getStateFromEvent(evtData: { sceneName: string; }, socketSettings: SocketSettings<ActionSettings>): StateEnum {
		return evtData.sceneName === socketSettings.sceneName ? StateEnum.Active : StateEnum.Inactive;
	}
}