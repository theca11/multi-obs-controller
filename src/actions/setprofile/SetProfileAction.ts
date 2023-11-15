import { sockets } from '../../plugin/sockets';
import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { StateEnum } from '../StateEnum';
import { getProfilesLists } from '../lists';
import { SocketSettings, SingleRequestPayload } from '../types';

type ActionSettings = { profileName: string }

export class SetProfileAction extends AbstractStatefulRequestAction<ActionSettings, 'CurrentProfileChanged'> {
	private _currentProfileName = new Array(sockets.length).fill(null);

	constructor() {
		super('dev.theca11.multiobs.setprofile', { titleParam: 'profileName', statusEvent: 'CurrentProfileChanged' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('CurrentProfileChanged', ({ profileName }) => {
				this._currentProfileName[socketIdx] = profileName;
			});
		});
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SetCurrentProfile'> {
		const { profileName } = settings;
		return {
			requestType: 'SetCurrentProfile',
			requestData: { profileName: profileName },
		};
	}

	override async onPropertyInspectorReady({ context, action }: { context: string, action: string }) {
		const profilesLists = await getProfilesLists();
		const payload = { event: 'ProfileListLoaded', profilesLists: profilesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	override async onSocketConnected(socketIdx: number): Promise<void> {
		const { currentProfileName } = await sockets[socketIdx].call('GetProfileList');
		this._currentProfileName[socketIdx] = currentProfileName;
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this._currentProfileName[socketIdx] = null;
	}

	override async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		if (!socketSettings.profileName) return StateEnum.Inactive;
		return socketSettings.profileName === this._currentProfileName[socketIdx] ? StateEnum.Active : StateEnum.Inactive;
	}

	override async shouldUpdateState(evtData: { profileName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return !!socketSettings.profileName;
	}

	override getStateFromEvent(evtData: { profileName: string; }, socketSettings: SocketSettings<ActionSettings>): StateEnum {
		return evtData.profileName === socketSettings.profileName ? StateEnum.Active : StateEnum.Inactive;
	}
}