$PI.onSendToPropertyInspector('dev.theca11.multiobs.togglefilter', ({ payload }) => {
	const { event, scenesLists, inputsLists, filterList } = payload;

	if (event === 'SourceListLoaded') {
		document.querySelectorAll('.sources > datalist').forEach((el, idx) => {
			const sceneOptions = [...scenesLists[idx]].reverse().map((scene) => {
				const option = document.createElement('option');
				option.value = scene.sceneName;
				option.textContent = scene.sceneName;
				return option;
			});
			const inputOptions = [...inputsLists[idx]].reverse().map((input) => {
				const option = document.createElement('option');
				option.value = input.inputName;
				option.textContent = input.inputName;
				return option;
			});
			el.replaceChildren(...inputOptions, ...sceneOptions);
		});
	}
	else if (event === 'FilterListLoaded') {
		document.querySelectorAll('.filters > datalist').forEach((el, idx) => {
			if (idx === payload.idx) {
				const options = [...filterList].map((filterName) => {
					const option = document.createElement('option');
					option.value = filterName;
					option.textContent = filterName;
					return option;
				});
				el.replaceChildren(...options);
			}
		});
	}
});

document.querySelectorAll('input[name="sourceName"').forEach((el, idx) => {
	// Init call
	$PI.sendToPlugin({
		event: 'GetSourceFilterList',
		socketIdx: idx,
		sourceName: el.value,
	});

	// Attach listener
	el.addEventListener(
		'input',
		Utils.debounce(150, () => {
			$PI.sendToPlugin({
				event: 'GetSourceFilterList',
				socketIdx: idx,
				sourceName: el.value,
			});
		}),
	);
});
