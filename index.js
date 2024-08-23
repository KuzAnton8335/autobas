import express from "express";
// подключаем библиотеки для работы с файлами
import { readFile } from "node:fs/promises";
// подключаем path для работы с путями
import path from "node:path";
// подключаем url для работы с путями
import url from "node:url";
// импорт функции DateTime from luxon для работы с датами  и временем
import { DateTime } from "luxon";

// конфигурируем сервер для работы с buses.json
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// timeZone
const timeZone = "UTC";

// расскрываем серевер
const app = express();
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
	const [hours, minutes] = firstDepartureTime.split(":").map(Number);
	// время первого отправления
	let departure = DateTime.now()
		.set({ hours, minutes })
		.setZone(timeZone);

	// сравнение now и departure
	if (now > departure) {
		departure = departure.plus({ minutes: frequencyMinutes });
	}
	// время окончания работы автовокзала
	const endOfDay = DateTime.now().set({ hours: 23, minutes: 59, seconds: 59, }).setZone(timeZone);

	// сравнение для начала рабочего дня
	if (departure > endOfDay) {
		departure = departure.startOf("day").plus({ days: 1 }).set({ hours, minutes })
	}
	// цикл while пока now(текущее время) > departure(времени первого отправления)
	while (now > departure) {
		departure = departure.plus({ minutes: frequencyMinutes });
	}

	// сравнение для начала рабочего дня
	if (departure > endOfDay) {
		departure = departure.startOf("day").plus({ days: 1 }).set({ hours, minutes })
	}

	// возвращаем время и дату для отправки автобуса
	return departure;
}



// обновленние данных о движении автобусов
const sendUpdateData = async () => {
	const buses = await loadBuses();
	// обновление времени отправления автобуса и времени пути автобуса
	const updatedBuses = buses.map((bus) => {
		const nextDeparture = getNextDeparture(
			bus.firstDepartureTime,
			bus.frequencyMinutes);


		// возврощаем время и дату для отправки автобуса
		return {
			...bus,
			nextDeparture: {
				data: nextDeparture.toFormat('yyyy-MM-dd'),
				time: nextDeparture.toFormat('HH:mm:ss'),
			}
		}
	});
	return updatedBuses;
}

// вывод запроса данных отправления автобусов
app.get('/next-departure', async (req, res) => {
	try {
		const updatedBuses = await sendUpdateData();
		res.json(updatedBuses)
	} catch (error) {
		res.send('error')
	}
})

app.listen(port, () => {
	console.log("Server running on http://localhost:" + port);
})