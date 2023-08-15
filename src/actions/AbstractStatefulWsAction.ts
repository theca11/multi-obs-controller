import { AbstractBaseWsAction } from "./AbstractBaseWsAction";
import { evtEmitter } from "./states";
import { ConstructorParams, PartiallyRequired, State } from "./types";

export abstract class AbstractStatefulWsAction extends AbstractBaseWsAction {

	constructor(UUID: string, params: PartiallyRequired<ConstructorParams, 'statusEvent'>) {
		super(UUID, params);

		// Attach listener to status event to update key image
		const { statusEvent } = params;
		evtEmitter.on(statusEvent, async (evtSocketIdx, evtData) => {
			for (const [context, settings] of this._ctxSettingsCache) {
				try {
					const socketSettings = this.getSettingsArray(settings)[evtSocketIdx];
					if (socketSettings && this._ctxStatesCache.has(context) && await this.shouldUpdateState(evtData, socketSettings, evtSocketIdx)) {
						const newState = await this.getStateFromEvent(evtData, socketSettings);
						let prevStates = this._ctxStatesCache.get(context) as State[];
						prevStates[evtSocketIdx] = newState;
						this._ctxStatesCache.set(context, prevStates);
					}
				}
				catch (e) {
					console.error(`Error getting state from event: ${e}`)
				}
			}
			// to-do: create a dirtyContexts array and pass it to updateImage, to avoid updating contexts whose states haven't changed
			this.updateImages();
		});
	}

	abstract fetchState(socketSettings: Record<string, any>, socketIdx: number): Promise<boolean | null>;

	/**
	 * Whether a received event should trigger an state update an action
	 * @param evtData Event data
	 * @param socketSettings Action settings for the corresponding socket
	 * @param socketIdx Socket index
	 */
	abstract shouldUpdateState(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean>;
	
	/**
	 * Get state associated with the action from the event that notifies a state update
	 * @param evtData Event data
	 * @param socketSettings Action settings for the corresponding socket
	 * @returns New true/false state
	 */
	abstract getStateFromEvent(evtData: Record<string, any>, socketSettings: Record<string, any>): Promise<boolean>;
}