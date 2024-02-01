import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getScenesLists } from '../lists';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { sceneName: string, studioTarget: 'preview' | 'program' }

export class SetSceneAction extends AbstractStatefulRequestAction<ActionSettings, 'CurrentProgramSceneChanged'> {
	private _currentSceneName = new Array(sockets.length).fill(null);
	private _currentPreviewSceneName = new Array(sockets.length).fill(null);
	private _studioModeEnabled: boolean[] = new Array(sockets.length).fill(false);

	constructor() {
		super('dev.theca11.multiobs.setscene', {
			titleParam: 'sceneName',
			statusEvent: ['CurrentProgramSceneChanged', 'CurrentPreviewSceneChanged', 'StudioModeStateChanged'],
		});

		sockets.forEach((socket, socketIdx) => {
			socket.on('CurrentProgramSceneChanged', ({ sceneName }) => {
				this._currentSceneName[socketIdx] = sceneName;
			});

			socket.on('CurrentPreviewSceneChanged', ({ sceneName }) => {
				this._currentPreviewSceneName[socketIdx] = sceneName;
			});

			socket.on('StudioModeStateChanged', ({ studioModeEnabled }) => {
				this._studioModeEnabled[socketIdx] = studioModeEnabled;
				this._currentPreviewSceneName[socketIdx] = studioModeEnabled ? this._currentSceneName[socketIdx] : null;
			});
		});
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SetCurrentProgramScene' | 'SetCurrentPreviewScene'> {
		const { sceneName, studioTarget } = settings;
		return {
			requestType: (!this._studioModeEnabled[socketIdx] || studioTarget === 'program') ? 'SetCurrentProgramScene' : 'SetCurrentPreviewScene',
			requestData: { sceneName: sceneName },
		};
	}

	override async onPropertyInspectorReady({ context, action }: { context: string, action: string }) {
		const scenesLists = await getScenesLists();
		const payload = { event: 'SceneListLoaded', scenesLists: scenesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	override async onSocketConnected(socketIdx: number): Promise<void> {
		const { currentProgramSceneName } = await sockets[socketIdx].call('GetCurrentProgramScene');
		this._currentSceneName[socketIdx] = currentProgramSceneName;
		const { studioModeEnabled } = await sockets[socketIdx].call('GetStudioModeEnabled');
		this._studioModeEnabled[socketIdx] = studioModeEnabled;
		if (studioModeEnabled) {
			const { currentPreviewSceneName } = await sockets[socketIdx].call('GetCurrentPreviewScene');
			this._currentPreviewSceneName[socketIdx] = currentPreviewSceneName;
		}
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this._currentSceneName[socketIdx] = null;
		this._currentPreviewSceneName[socketIdx] = null;
		this._studioModeEnabled[socketIdx] = false;
	}

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		if (!socketSettings.sceneName) return StateEnum.Inactive;
		return socketSettings.sceneName === this._currentSceneName[socketIdx] ? StateEnum.Active : (this._studioModeEnabled[socketIdx] && socketSettings.sceneName === this._currentPreviewSceneName[socketIdx]) ? StateEnum.Intermediate : StateEnum.Inactive;
	}

	override async shouldUpdateState(evtData: { sceneName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return !!socketSettings.sceneName;
	}

	override getStateFromEvent(evtData: { sceneName?: string, studioModeEnabled?: boolean }, socketSettings: SocketSettings<ActionSettings>, evtName: 'CurrentProgramSceneChanged' | 'CurrentPreviewSceneChanged' | 'StudioModeStateChanged', socketIdx: number): StateEnum {
		if (evtName === 'CurrentProgramSceneChanged') {
			return evtData.sceneName === socketSettings.sceneName ? StateEnum.Active : (this._studioModeEnabled[socketIdx] && this._currentPreviewSceneName[socketIdx] === socketSettings.sceneName) ? StateEnum.Intermediate : StateEnum.Inactive;
		}
		else if (evtName === 'CurrentPreviewSceneChanged') {
			return this._currentSceneName[socketIdx] === socketSettings.sceneName ? StateEnum.Active : evtData.sceneName === socketSettings.sceneName ? StateEnum.Intermediate : StateEnum.Inactive;
		}
		else if (evtName === 'StudioModeStateChanged') {
			return this._currentSceneName[socketIdx] === socketSettings.sceneName ? StateEnum.Active : StateEnum.Inactive;
		}

		return StateEnum.Inactive;
	}
}