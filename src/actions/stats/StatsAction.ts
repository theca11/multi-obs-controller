import { sockets } from '../../plugin/sockets';
import { clamp } from '../../plugin/utils';
import { DidReceiveSettingsData, PersistentSettings, WillAppearData, WillDisappearData } from '../types';

type StatObj = { target: number, stat: string, color: string }

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
		const batchResults = await Promise.allSettled(sockets.map(s =>
			s.isConnected
				? s.callBatch([
					{ requestType: 'GetStats' },
					{ requestType: 'GetStreamStatus' },
					{ requestType: 'GetRecordStatus' },
				])
				: Promise.reject(),
		));
		batchResults.map((res, socketIdx) => {
			if (res.status === 'fulfilled') {
				res.value.map((r, i) => {
					if (i === 0) this._stats[socketIdx]['general'] = r.responseData;
					else if (i === 1) this._stats[socketIdx]['stream'] = r.responseData;
					else if (i === 2) this._stats[socketIdx]['record'] = r.responseData;
				});
			}
		});
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
			const fontSize = Math.floor(clamp(canvas.height / statsArr.length - 11, 20, 36));
			ctx.font = `bold ${fontSize}px Arial`;
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'center';
			const yPad = 10;
			const yStep = (canvas.height - 2 * yPad) / (statsArr.length);
			let lastTarget = 1;
			for (const [idx, { target, stat, color }] of statsArr.entries()) {
				// Target separating line
				if (target !== lastTarget && idx !== 0) {
					ctx.save();
					ctx.strokeStyle = 'black';
					ctx.lineWidth = 1;
					// ctx.setLineDash([20, 11]);
					ctx.beginPath();
					ctx.moveTo(0, yStep * idx + yPad - 2);
					ctx.lineTo(canvas.width, yStep * idx + yPad - 2);
					ctx.stroke();
					ctx.restore();
				}
				lastTarget = target;

				const yPos = yStep * (idx) + yStep / 2 + yPad;
				const text = this.getStatString(target - 1, stat) || '???';
				ctx.save();
				ctx.fillStyle = color;
				ctx.strokeStyle = 'black';
				ctx.lineWidth = Math.floor(fontSize / 10);
				ctx.lineJoin = 'round';
				ctx.miterLimit = 2;
				ctx.strokeText(text, canvas.width / 2, yPos, canvas.width - 5);
				ctx.fillText(text, canvas.width / 2, yPos, canvas.width - 5);
				ctx.restore();
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

	getStatString(socketIdx: number, statName: string): string {
		const socketStats = this._stats[socketIdx];
		if (!socketStats) return '';
		const [group, name] = statName.split('.');
		const groupStats = socketStats[group];
		if (!groupStats) return '';
		if (group === 'general') {
			if (name === 'cpuUsage') return groupStats[name].toFixed(1) + '%';
			if (name === 'memoryUsage') return (groupStats[name] * 1024 * 1024 / 1024.01 / 1024.01).toFixed(1) + ' MB';
			if (name === 'availableDiskSpace') {
				const bytes = groupStats[name] * 1024 * 1024;
				if (bytes > 1024 * 1024 * 1024 * 1024) return (bytes / 1024.01 / 1024.01 / 1024.01 / 1024.01).toFixed(1) + ' TB';
				if (bytes > 1024 * 1024 * 1024) return (bytes / 1024.01 / 1024.01 / 1024.01).toFixed(1) + ' GB';
				else return (bytes / 1024.01 / 1024.01).toFixed(1) + ' MB';
			}
			if (name === 'activeFps') return groupStats[name].toFixed(0) + ' FPS';
			if (name === 'averageFrameRenderTime') return groupStats[name].toFixed(1) + ' ms';
			if (name === 'renderSkippedFrames') {
				const skipped = groupStats['renderSkippedFrames'];
				const total = groupStats['renderTotalFrames'];
				return `${skipped}/${total} (${(skipped / total * 100).toFixed(1)}%)`;
			}
			if (name === 'outputSkippedFrames') {
				const skipped = groupStats['outputSkippedFrames'];
				const total = groupStats['outputTotalFrames'];
				return `${skipped}/${total} (${(skipped / total * 100).toFixed(1)}%)`;
			}
		}
		else if (group === 'stream') {
			if (name === 'outputActive') return groupStats['outputReconnecting'] ? 'Reconnecting' : groupStats['outputActive'] ? 'Active' : 'Inactive';
			if (name === 'outputSkippedFrames') {
				const skipped = groupStats['outputSkippedFrames'];
				const total = groupStats['outputTotalFrames'];
				return `${skipped}/${total} (${(skipped / total * 100).toFixed(1)}%)`;
			}
		}
		else if (group === 'record') {
			if (name === 'outputActive') return groupStats['outputPaused'] ? 'Paused' : groupStats['outputActive'] ? 'Active' : 'Inactive';
		}
		return '';
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