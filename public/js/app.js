// получение данных с сервера
const fetchBusData = async () => {
	try {
		// запрос на сервер
		const response = await fetch("/next-departure");
		// проверка ответа
		if (!response.ok) {
			throw new Error(` HTTP error! status:${response.status}`);
		}
		// получение данных
		const buses = await response.json();
		return buses;

	} catch (error) {
		console.error(`Error fetching bus data:${error}`)
	}
}
// форматирование даты
const formateDate = (date) => date.toISOString().split('T')[0];
// форматирование времени
const formateTime = (date) => date.toTimeString().split(" ")[0].slice(0, 5);

// отрисовка таблицы
const renderBusData = (buses) => {
	// получение таблицы
	const tableBody = document.querySelector('#bus-table tbody');
	// очистка таблицы
	tableBody.textContent = '';
	//перебираем данные
	buses.forEach(bus => {
		// делаем строку таблицы
		const row = document.createElement('tr');
		// реальное время и дата
		const nextDepartureDateTimeUTC = new Date(`${bus.nextDeparture.data}T${bus.nextDeparture.time}Z`,);
		// заполняем строку таблицы
		row.innerHTML = `
			<td>${bus.busNumber}</td>
			<td>${bus.startPoint} - ${bus.endPoint}</td>
			<td>${formateDate(nextDepartureDateTimeUTC)}</td>
			<td>${formateTime(nextDepartureDateTimeUTC)}</td>
		`;
		tableBody.appendChild(row);
	})

}

// инициализация проекта на клиенте
const init = async () => {
	// данные об автобусах для отрисовки таблицы
	const buses = await fetchBusData();
	renderBusData(buses);
}
init();