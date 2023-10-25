import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getScenesLists } from '../lists';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { sceneName: string }

export class SetSceneAction extends AbstractStatefulRequestAction<ActionSettings, 'CurrentProgramSceneChanged'> {
	currentSceneName = new Array(sockets.length).fill(null);

	constructor() {
		super('dev.theca11.multiobs.setscene', { titleParam: 'sceneName', statusEvent: 'CurrentProgramSceneChanged' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('CurrentProgramSceneChanged', ({ sceneName }) => {
				this.currentSceneName[socketIdx] = sceneName;
			});
		});
	}

	getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SetCurrentProgramScene'> {
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

	override async onSocketConnected(socketIdx: number): Promise<void> {
		try {
			const { currentProgramSceneName } = await sockets[socketIdx].call('GetCurrentProgramScene');
			this.currentSceneName[socketIdx] = currentProgramSceneName;
		}
		catch {
			this.currentSceneName[socketIdx] = null;
		}
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this.currentSceneName[socketIdx] = null;
	}

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		if (!socketSettings.sceneName) return StateEnum.Inactive;
		return socketSettings.sceneName === this.currentSceneName[socketIdx] ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(evtData: { sceneName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return !!socketSettings.sceneName;
	}

	getStateFromEvent(evtData: { sceneName: string; }, socketSettings: SocketSettings<ActionSettings>): StateEnum {
		return evtData.sceneName === socketSettings.sceneName ? StateEnum.Active : StateEnum.Inactive;
	}
}