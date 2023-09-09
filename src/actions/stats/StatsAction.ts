import { sockets } from '../../plugin/sockets';
import { DidReceiveSettingsData, PersistentSettings, WillAppearData, WillDisappearData } from '../types';

type StatObj = { target: number, stat: string, color: string }

const dataOptions = {
	general: {
		cpuUsage: {
			label: 'CPU',
			format: (usage: number | null) => usage?.toFixed(1) + '%',
		},
		memoryUsage: {
			label: 'Mem',
			format: (usage: number | null) => Math.floor(usage ?? 0) + ' MB',
		},
		availableDiskSpace: {
			label: 'Disk',
			format: (space: number | null) => Math.floor((space ?? 0) / 1024) + ' GB',
		},
	},
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export class StatsAction extends Action {

	private _ctxSettingsCache = new Map<string, StatObj[]>();
	private _stats: any = [{}, {}];

	constructor() {
		super('dev.theca11.multiobs.stats');

		this.onWillAppear(async ({ context, payload }: WillAppearData<PersistentSettings>) => {
			this._ctxSettingsCache.set(context, this.formatStatSettings(payload.settings));
			this.updateImages();
		});

		this.onWillDisappear(async ({ context }: WillDisappearData<PersistentSettings>) => {
			this._ctxSettingsCache.delete(context);
		});

		this.onDidReceiveSettings(({ context, payload }: DidReceiveSettingsData<PersistentSettings>) => {
			this._ctxSettingsCache.set(context, this.formatStatSettings(payload.settings));
			this.updateImages();
		});

		setInterval(async () => {
			// console.log('updating stats');
			await this._fetchStats();
			this.updateImages();
		}, 2000);
	}

	async _fetchStats() {
		const callResults = await Promise.allSettled(sockets.map(s =>
			s.isConnected ? s.call('GetStats') : Promise.reject(),
		));

		const results = callResults.map(res => res.status === 'fulfilled' ? res.value : null);
		results.map((r, i) => this._stats[i].general = r);
	}

	updateImages() {
		for (const [context] of this._ctxSettingsCache) {

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.globalCompositeOperation = 'source-over';

			canvas.width = 144;
			canvas.height = 144;

			const statsArr = this._ctxSettingsCache.get(context);
			if (!statsArr) return;

			// Background color
			ctx.fillStyle = '#517a96';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Text
			ctx.font = `bold ${clamp(canvas.height / statsArr.length - 11, 20, 36)}px Arial`;
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'center';
			for (const [idx, { target, stat, color }] of statsArr.entries()) {
				ctx.fillStyle = color;
				console.log(this._stats);
				const [statGroup, statName] = stat.split('.');

				const yPos = (canvas.height) / (statsArr.length + 1) * (idx + 1);

				ctx.fillText(`${(dataOptions as any)[statGroup][statName]?.['format'](this._stats[target - 1]?.[statGroup]?.[statName] ?? 0)}`, canvas.width / 2, yPos, canvas.width - 5);
			}

			const b64 = canvas.toDataURL('image/png', 1);
			$SD.setImage(context, b64);
		}
	}

	formatStatSettings(actionSettings: PersistentSettings): StatObj[] {
		const settingsArray = this.getSettingsArray(actionSettings);
		const formattedStatsArray = settingsArray.flatMap((settings, socketIdx) => {
			if (!settings) return [];
			let { stats, colors } = settings as { stats: string | string[], colors: string | string[] };
			if (!stats) return [];
			if (!Array.isArray(stats)) stats = [stats];
			if (!Array.isArray(colors)) colors = [colors];
			const statObjArray = [];
			for (let i = 0; i < stats.length; i++) {
				statObjArray.push({ target: socketIdx + 1, stat: stats[i], color: colors[i] });
			}
			return statObjArray;
		}).filter(item => item !== null);
		return formattedStatsArray;
	}


	// -- General helpers --
	getCommonSettings(settings: PersistentSettings) {
		settings = settings ?? {};
		return {
			target: parseInt(settings.common?.target || '0'),
			indivParams: !!settings.common?.indivParams,
		};
	}

	getTarget(settings: PersistentSettings): number {
		return this.getCommonSettings(settings).target;
	}

	getSettingsArray(settings: PersistentSettings) {
		settings = settings ?? {};
		const { target, indivParams } = this.getCommonSettings(settings);
		const settingsArray = [];
		for (let i = 0; i < sockets.length; i++) {
			if (target === 0 || target === i + 1) {
				settingsArray.push(settings[`params${(target === 0 && !indivParams) ? 1 : i + 1}`] ?? {});
			}
			else {
				settingsArray.push(null);
			}
		}
		return settingsArray;
	}
}