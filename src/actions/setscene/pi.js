$PI.onSendToPropertyInspector('dev.theca11.multiobs.setscene', ({ payload }) => {
	const { event, scenesLists } = payload;

	if (event === 'SceneListLoaded') {
		document.querySelectorAll('datalist').forEach((el, idx) => {
			const options = [...scenesLists[idx]].reverse().map(scene => {
				let option = document.createElement('option');
				option.value = scene.sceneName;
				option.textContent = scene.sceneName;
				return option;
			})
			el.replaceChildren(...options); 
		}); 
	}
});
