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

const getTimeRemainingSeconds = (departureTime) => {
	// новые данные по дате
	const now = new Date();
	// получаем разницу времени
	const timeDeference = departureTime - now;
	//   вернем время в секундах
	return Math.floor(timeDeference / 1000);
}

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

		const remainingSeconds = getTimeRemainingSeconds(nextDepartureDateTimeUTC);
		const remaningTimeText = remainingSeconds < 60 ? "Отправляется" : bus.nextDeparture.remaining


		// заполняем строку таблицы
		row.innerHTML = `
			<td>${bus.busNumber}</td>
			<td>${bus.startPoint} - ${bus.endPoint}</td>
			<td>${formateDate(nextDepartureDateTimeUTC)}</td>
			<td>${formateTime(nextDepartureDateTimeUTC)}</td>
			<td>${remaningTimeText}</td>
		`;
		tableBody.appendChild(row);
	})
}

const initWebsoket = () => {
	// обращение к локальному хосту сервера websoket
	const ws = new WebSocket(`ws://${location.host}`);
	// обработка события "open" соединения (открытия сервера websoket)
	ws.addEventListener('open', () => {
		console.log("WebSocket connection is opened");
	});
	// обработка сообщений от websoket
	ws.addEventListener('message', (event) => {
		const buses = JSON.parse(event.data);
		renderBusData(buses);
	})
	// обработка сообщений от websoket на случай ошибки в webbsocket
	ws.addEventListener('error', (error) => {
		console.error(`WebSocket error: ${error}`);
	})
	// закрытие соединения от websoket
	ws.addEventListener('close', () => {
		console.error(`WebSocket connection close`);
	})
}

// обновление времени
const updateTime = () => {
	// элемент текущего времени
	const currentTimeElement = document.getElementById("current-time");
	// новые данные по дате
	const now = new Date();
	// вывод текущего времени
	currentTimeElement.textContent = now.toTimeString().split(" ")[0];
	// обновление времени через секунду
	setTimeout(updateTime, 1000);
}

// инициализация проекта на клиенте
const init = async () => {
	// данные об автобусах для отрисовки таблицы
	const buses = await fetchBusData();
	renderBusData(buses);
	// загрузка сервера websoket
	initWebsoket();
	// обновление времени
	updateTime();
}
init();