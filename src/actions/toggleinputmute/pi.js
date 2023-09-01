$PI.onSendToPropertyInspector('dev.theca11.multiobs.toggleinputmute', ({ payload }) => {
	const { event, inputsLists } = payload;

	if (event === 'InputListLoaded') {
		document.querySelectorAll('datalist').forEach((el, idx) => {
			const options = [...inputsLists[idx]].reverse().map((input) => {
				const option = document.createElement('option');
				option.value = input.inputName;
				option.textContent = input.inputName;
				return option;
			});
			el.replaceChildren(...options);
		});
	}
});
