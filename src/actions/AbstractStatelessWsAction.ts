import { AbstractBaseWsAction, StateEnum } from './AbstractBaseWsAction';

export abstract class AbstractStatelessWsAction extends AbstractBaseWsAction {

	async fetchState(): Promise<StateEnum.None> {
		return StateEnum.None;
	}
}