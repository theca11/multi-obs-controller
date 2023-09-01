$PI.onSendToPropertyInspector('dev.theca11.multiobs.togglesource', ({ payload }) => {
	const { event, scenesLists, sourceList } = payload;

	if (event === 'SceneListLoaded') {
		document.querySelectorAll('.scenes > datalist').forEach((el, idx) => {
			const options = [...scenesLists[idx]].reverse().map((scene) => {
				const option = document.createElement('option');
				option.value = scene.sceneName;
				option.textContent = scene.sceneName;
				return option;
			});
			el.replaceChildren(...options);
		});
	}
	else if (event === 'SourceListLoaded') {
		document.querySelectorAll('.sources > datalist').forEach((el, idx) => {
			if (idx === payload.idx) {
				const options = [...sourceList].reverse().map((sourceName) => {
					const option = document.createElement('option');
					option.value = sourceName;
					option.textContent = sourceName;
					return option;
				});
				el.replaceChildren(...options);
			}
		});
	}
});

document.querySelectorAll('input[name="sceneName"').forEach((el, idx) => {
	// Init call
	$PI.sendToPlugin({
		event: 'GetSceneItemsList',
		socketIdx: idx,
		sceneName: el.value,
	});

	// Attach listener
	el.addEventListener(
		'input',
		Utils.debounce(150, () => {
			$PI.sendToPlugin({
				event: 'GetSceneItemsList',
				socketIdx: idx,
				sceneName: el.value,
			});
		}),
	);
});
