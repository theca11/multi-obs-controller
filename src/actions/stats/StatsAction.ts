import { OBSResponseTypes } from 'obs-websocket-js';
import { sockets } from '../../plugin/sockets';
import { clamp } from '../../plugin/utils';
import { AbstractStatelessAction } from '../BaseWsAction';
import { DidReceiveSettingsData, PersistentSettings, WillAppearData, WillDisappearData } from '../types';

type ActionSettings = { stats: string[], colors: string[] }
type StatConfig = { target: number, stat: string, color: string }

// to-do: review what's happening with default image, that can't be loaded as per console log

export class StatsAction extends AbstractStatelessAction<ActionSettings> {

	private _ctxStatsSettings = new Map<string, StatConfig[]>();
	private first_encoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_skipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_rendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_lagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_total = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_dropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);

	private _statsUpdateInterval: NodeJS.Timeout | null = null;

	_generalStats = new Array(sockets.length).fill(null);
	_streamStats = new Array(sockets.length).fill(null);
	_recordStats = new Array(sockets.length).fill(null);

	constructor() {
		super('dev.theca11.multiobs.stats', { hideTargetIndicators: true });

		this.onWillAppear(async ({ context, payload }: WillAppearData<PersistentSettings<ActionSettings>>) => {
			this._ctxStatsSettings.set(context, this.formatStatSettings(payload.settings));
			if (this._ctxStatsSettings.size === 1 && !this._statsUpdateInterval) {
				await this.fetchStats();
				this._statsUpdateInterval = setInterval(async () => {
					await this.fetchStats();
					this.updateImages();
				}, 2000);
			}
			this.updateKeyImage(context);
		});

		this.onWillDisappear(async ({ context }: WillDisappearData<PersistentSettings<ActionSettings>>) => {
			this._ctxStatsSettings.delete(context);
			if (this._ctxStatsSettings.size === 0 && this._statsUpdateInterval) {
				clearInterval(this._statsUpdateInterval);
				this._statsUpdateInterval = null;
			}
		});

		this.onDidReceiveSettings(({ context, payload }: DidReceiveSettingsData<PersistentSettings<ActionSettings>>) => {
			this._ctxStatsSettings.set(context, this.formatStatSettings(payload.settings));
			this.updateKeyImage(context);
		});

		this.onLongPress(() => {
			this.resetStats();
		});
	}

	resetStats() {
		// Reset stats from skipped/dropped frames
		this.first_encoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_skipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_rendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_lagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_total = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_dropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	}

	getFontSizeToFit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
		ctx.font = 'bold 1pt Arial';
		return maxWidth / ctx.measureText(text).width;
	}

	override async getForegroundImage(context: string) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.globalCompositeOperation = 'source-over';

		canvas.width = 144;
		canvas.height = 144;

		const statsArr = this._ctxStatsSettings.get(context);
		if (!statsArr) return;

		// Text
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		const yPad = 5;
		const yStep = (canvas.height - 2 * yPad) / (statsArr.length);
		let lastTarget = 1;
		for (const [idx, { target, stat, color }] of statsArr.entries()) {
			// Target separating line
			if (target !== lastTarget && idx !== 0) {
				ctx.save();
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 2;
				// ctx.setLineDash([20, 11]);
				ctx.beginPath();
				ctx.moveTo(0, yStep * idx + yPad + 0.5);
				ctx.lineTo(canvas.width, yStep * idx + yPad + 0.5);
				ctx.stroke();
				ctx.restore();
			}
			lastTarget = target;

			const yPos = yStep * (idx) + yStep / 2 + yPad;
			const text = this.getStatString(target - 1, stat) || '-';
			ctx.save();
			// Adjust size dynamically
			const fontHeightLimit = Math.floor(clamp(canvas.height / statsArr.length - 11, 16, 34));
			ctx.font = 'bold 1pt Arial';
			const fontWidthLimit = Math.floor((canvas.width - 10) / ctx.measureText(text).width);
			const fontSize = Math.min(fontWidthLimit, fontHeightLimit);
			ctx.font = `bold ${fontSize}pt Arial`;

			ctx.fillStyle = color;
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 2;
			ctx.lineJoin = 'round';
			ctx.strokeText(text, canvas.width / 2 + 0.5, yPos, canvas.width - 10);
			ctx.fillText(text, canvas.width / 2 + 0.5, yPos, canvas.width - 10);
			ctx.restore();
		}

		return canvas;
	}

	formatStatSettings(actionSettings: PersistentSettings<ActionSettings>): StatConfig[] {
		const settingsArray = this.getSettingsArray(actionSettings);
		const formattedStatsArray = settingsArray.flatMap((settings, socketIdx) => {
			if (!settings) return [];
			let { stats, colors } = settings as { stats: string | string[], colors: string | string[] };
			if (!stats) return [];
			if (!Array.isArray(stats)) stats = [stats];
			if (!Array.isArray(colors)) colors = [colors];
			const statObjArray: StatConfig[] = [];
			for (let i = 0; i < stats.length; i++) {
				statObjArray.push({ target: socketIdx + 1, stat: stats[i], color: colors[i] });
			}
			return statObjArray;
		}).filter(item => item !== null);
		return formattedStatsArray;
	}

	getStatString(socketIdx: number, statName: string): string {
		const [group, name] = statName.split('.');
		if (group === 'general') {
			const groupStats = this._generalStats[socketIdx];
			if (!groupStats) return '';
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
				let skipped = groupStats['renderSkippedFrames'];
				let total = groupStats['renderTotalFrames'];

				if (total < this.first_rendered[socketIdx] || skipped < this.first_lagged[socketIdx]) {
					this.first_rendered[socketIdx] = total;
					this.first_lagged[socketIdx] = skipped;
				}
				total -= this.first_rendered[socketIdx];
				skipped -= this.first_lagged[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} (${percentage.toFixed(1)}%)`;
			}
			if (name === 'outputSkippedFrames') {
				let skipped = groupStats['outputSkippedFrames'];
				let total = groupStats['outputTotalFrames'];

				if (total < this.first_encoded[socketIdx] || skipped < this.first_skipped[socketIdx]) {
					this.first_encoded[socketIdx] = total;
					this.first_skipped[socketIdx] = skipped;
				}
				total -= this.first_encoded[socketIdx];
				skipped -= this.first_skipped[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} (${percentage.toFixed(1)}%)`;
			}
		}
		else if (group === 'stream') {
			const groupStats = this._streamStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'outputActive') return groupStats['outputReconnecting'] ? 'Reconnecting' : groupStats['outputActive'] ? 'Active' : 'Inactive';
			if (name === 'outputSkippedFrames') {
				let skipped = groupStats['outputSkippedFrames'];
				let total = groupStats['outputTotalFrames'];

				if (total < this.first_total[socketIdx] || skipped < this.first_dropped[socketIdx]) {
					this.first_total[socketIdx] = total;
					this.first_dropped[socketIdx] = skipped;
				}
				total -= this.first_total[socketIdx];
				skipped -= this.first_dropped[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} (${percentage.toFixed(1)}%)`;
			}
		}
		else if (group === 'record') {
			const groupStats = this._recordStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'outputActive') return groupStats['outputPaused'] ? 'Paused' : groupStats['outputActive'] ? 'Active' : 'Inactive';
		}
		return '';
	}

	async fetchStats() {
		const batchResults = await Promise.allSettled(sockets.map(s =>
			s.isConnected
				? s.callBatch([
					{ requestType: 'GetStats' },
					{ requestType: 'GetStreamStatus' },
					{ requestType: 'GetRecordStatus' },
				])
				: Promise.reject(),
		));
		const responsesData = batchResults.map((res) => {
			if (res.status === 'fulfilled') {
				return res.value.map((r) => r.requestStatus.result === true ? r.responseData : null);
			}
			return null;
		});

		responsesData.map((responses, socketIdx) => {
			if (!responses) {
				this._generalStats[socketIdx] = null;
				this._streamStats[socketIdx] = null;
				this._recordStats[socketIdx] = null;
			}
			else {
				responses.map((response, i) => {
					if (i === 0) this._generalStats[socketIdx] = (response as OBSResponseTypes['GetStats']) ?? null;
					else if (i === 1) this._streamStats[socketIdx] = (response as OBSResponseTypes['GetStreamStatus']) ?? null;
					else if (i === 2) this._recordStats[socketIdx] = (response as OBSResponseTypes['GetRecordStatus']) ?? null;
				});
			}
		});
	}
}