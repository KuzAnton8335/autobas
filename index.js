import express from "express";
// подключаем библиотеки для работы с файлами
import { readFile } from "node:fs/promises";
// подключаем path для работы с путями
import path from "node:path";
// подключаем url для работы с путями
import url from "node:url";
// импорт функции DateTime from luxon для работы с датами  и временем
import { DateTime, Duration } from "luxon";
//импорт websocketserver из плагина ws
import { WebSocketServer } from "ws";

// конфигурируем сервер для работы с buses.json
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// timeZone
const timeZone = "UTC";

// расскрываем серевер
const app = express();
// обработка статических страниц
app.use(express.static(path.join(__dirname, "public")))
// порт сервера
const port = 3000;

// загрузка данных из файла buses.json в переменную при помощи async await
const loadBuses = async () => {
	const data = await readFile(path.join(__dirname, 'buses.json'), "utf-8");
	// возвращаем массив с данными
	return JSON.parse(data);
}



// время следующей отправки
const getNextDeparture = (firstDepartureTime, frequencyMinutes) => {
	// текущее время
	const now = DateTime.now().setZone(timeZone);
	// время первого отправления на часы и минуты
	const [hour, minute] = firstDepartureTime.split(":").map(Number);
	// время первого отправления
	let departure = DateTime.now()
		.set({ hour, minute, second: 0, millisecond: 0 })
		.setZone(timeZone);

	// сравнение now и departure
	if (now > departure) {
		departure = departure.plus({ minutes: frequencyMinutes });
	}
	// время окончания работы автовокзала
	const endOfDay = DateTime.now().set({ hour: 23, minute: 59, second: 59, }).setZone(timeZone);

	// сравнение для начала рабочего дня
	if (departure > endOfDay) {
		departure = departure.startOf("day").plus({ days: 1 }).set({ hour, minute })
	}
	// цикл while пока now(текущее время) > departure(времени первого отправления)
	while (now > departure) {
		departure = departure.plus({ minutes: frequencyMinutes });
	}

	// сравнение для начала рабочего дня
	if (departure > endOfDay) {
		departure = departure.startOf("day").plus({ days: 1 }).set({ hour, minute })
	}
	// возвращаем время и дату для отправки автобуса
	return departure;
}

// обновленние данных о движении автобусов
const sendUpdateData = async () => {
	// данные об автобусах
	const buses = await loadBuses();
	// получение текущего времени для вычесления интервала времени
	const now = DateTime.now().setZone(timeZone);
	// обновление времени отправления автобуса и времени пути автобуса
	const updatedBuses = buses.map((bus) => {
		const nextDeparture = getNextDeparture(
			bus.firstDepartureTime,
			bus.frequencyMinutes);
		// перезапись времени в текущий момент
		const timeRemaining = Duration.fromMillis(nextDeparture.diff(now).toMillis());

		// возврощаем время и дату для отправки автобуса
		return {
			...bus,
			nextDeparture: {
				data: nextDeparture.toFormat('yyyy-MM-dd'),
				time: nextDeparture.toFormat('HH:mm:ss'),
				remaining: timeRemaining.toFormat('hh:mm:ss'),
			}
		}
	});
	return updatedBuses;
}

// функция сортировки автобусов по дате отправления
const sortBuses = (buses) =>
	[...buses].sort((a, b) => new Date(`${a.nextDeparture.data}T${a.nextDeparture.time}`) - new Date(`${b.nextDeparture.data}T${b.nextDeparture.time}`)
	);

// вывод запроса данных отправления автобусов
app.get('/next-departure', async (req, res) => {
	try {
		const updatedBuses = await sendUpdateData();
		// сортировка по времени отправления автобусов
		const sortedBuses = sortBuses(updatedBuses);
		res.json(sortedBuses)
	} catch (error) {
		res.send('error')
	}
});

//создание websoket сервера
const wss = new WebSocketServer({ noServer: true });
// коллекция сообщений от клиентов
const clients = new Set();
// соеденение с клиентами
wss.on('connection', (ws) => {
	console.log('websoket connection');
	// добавление клиента в коллекцию
	clients.add(ws);
	// обновленние данных
	const sendUpdates = async () => {
		try {
			// обновленные данные об отправлении
			const updatedBuses = await sendUpdateData();
			// сортировка по времени отправления автобусов
			const sortedBuses = sortBuses(updatedBuses);
			// отправление данных в websoket сервер
			ws.send(JSON.stringify(sortedBuses));
		} catch (error) {
			// ошибка в работе сервера webbsocket
			console.error(`Error websoket connection:${error}`)
		}
	}
	// иртервал обновленния данных на 1 секунду
	const intervalId = setInterval(sendUpdates, 1000);

	// закрытия websoketa соединения
	ws.on('close', () => {
		console.log('websoket close');
		clients.delete(ws);
	})
})

// возвращает сервер
const server = app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
})
// обновление сервера
server.on('upgrade', (req, socket, head) => {
	wss.handleUpgrade(req, socket, head, (ws) => {
		wss.emit('connection', ws, req);
	});
})