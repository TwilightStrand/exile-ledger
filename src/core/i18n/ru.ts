import type { ImportError } from "../exchange";
import type { HotkeyAction } from "../hotkeys";
import type { ImportSource } from "../importers";
import type { FolderIcon } from "../model";
import type { GemKind, SocketItemKind } from "../searchChecks";
import type { PanelWidthUnit } from "../settings";
import type { ThemeId } from "../themes";
import type { Game } from "../tradeUrl";
import type { ListingWatcher } from "../watchers";
import type { Messages } from "./en";
import { plural } from "./plural";

const locale = "ru";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) =>
	plural(locale, n, {
		one: `${n} закладка`,
		few: `${n} закладки`,
		many: `${n} закладок`,
		other: `${n} закладки`,
	});

const folders = (n: number) =>
	plural(locale, n, {
		one: `${n} папка`,
		few: `${n} папки`,
		many: `${n} папок`,
		other: `${n} папки`,
	});

const results = (n: number) =>
	plural(locale, n, {
		one: `${number(n)} результат`,
		few: `${number(n)} результата`,
		many: `${number(n)} результатов`,
		other: `${number(n)} результата`,
	});

const fixCorrupted = "Установите «Осквернён» в значение «Любой» или «Да».";

export const ru: Messages = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "Любой предмет",
		cancel: "Отмена",
		delete: "Удалить",
		keep: "Оставить",
		liveSearch: "Живой поиск",
		savedToBookmarks: "Сохранено в закладках",
		results,
	},
	time: {
		justNow: "только что",
		minutesAgo: (n: number) => `${n} мин назад`,
		hoursAgo: (n: number) => `${n} ч назад`,
		yesterday: "вчера",
		daysAgo: (n: number) => `${n} дн. назад`,
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "Изменить размер панели",
		resizeValue: (percent: number) => `${percent}% ширины окна`,
		resizeValuePx: (px: number) => `${px} px`,
		collapse: "Свернуть Exile Ledger",
		expand: "Развернуть Exile Ledger",
		expandTab: "Ledger",
		sections: "Разделы панели",
		tabs: {
			bookmarks: "Закладки",
			history: "История",
			pinned: "Закрепл.",
			watchers: "Слежка",
		},
	},
	currentSearch: {
		heading: "Текущий поиск",
		problems: "Проблемы поиска",
		save: "Сохранить поиск",
		empty: "Выполните поиск на торговом сайте, и он появится здесь.",
	},
	bookmarks: {
		defaultFolder: "Сохранённые поиски",
		nav: "Закладки",
		emptyTitle: "Закладок пока нет",
		emptyBody:
			"Сохраните поиск, чтобы он остался здесь. Папки синхронизируются с другими вашими браузерами.",
		newFolder: "Новая папка",
		newFolderName: "Название новой папки",
		folderNamePlaceholder: "Название папки",
		folderName: "Название папки",
		bookmarkName: "Название закладки",
		archived: "В архиве",
		folderIcon: "Значок папки",
		folderIcons: {
			folder: "Папка",
			sword: "Меч",
			bow: "Лук",
			shield: "Щит",
			helmet: "Шлем",
			ring: "Кольцо",
			amulet: "Амулет",
			gem: "Камень",
			flask: "Фласка",
			map: "Карта",
			coin: "Валюта",
			star: "Звезда",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `Переименовать ${name}`,
		delete: (name: string) => `Удалить ${name}`,
		archive: (name: string) => `Архивировать ${name}`,
		restore: (name: string) => `Восстановить ${name}`,
		newFolderIn: (name: string) => `Новая папка в ${name}`,
		changeIcon: (name: string) => `Сменить значок: ${name}`,
		copyShareFor: (name: string) => `Скопировать строку для обмена: ${name}`,
		copyShare: "Скопировать строку для обмена",
		shareCopied: "Строка для обмена скопирована",
		copied: "Скопировано",
		overwrite: (name: string) => `Заменить ${name} текущим поиском`,
		confirmOverwrite: (name: string) => `Заменить «${name}» текущим поиском?`,
		replace: "Заменить",
		watch: (name: string) => `Следить за новыми результатами: ${name}`,
		unwatch: (name: string) => `Не следить за новыми результатами: ${name}`,
		markDone: (name: string) => `Отметить ${name} как выполненное`,
		markNotDone: (name: string) => `Снять отметку о выполнении: ${name}`,
		done: "Выполнено",
		more: (name: string) => `Ещё для ${name}`,
		allDone: "Отметить всё как выполненное",
		allNotDone: "Снять все отметки о выполнении",
		changeLeague: "Сменить лигу",
		league: "Лига",
		leaguePlaceholder: "Название лиги, например Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `Всё здесь уже было в лиге ${league}.`
				: `Перенесено в ${league}: ${bookmarks(n)}.`,
		confirmDeleteBookmark: (name: string) => `Удалить «${name}»?`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							one: `${subfolders} вложенная папка`,
							few: `${subfolders} вложенные папки`,
							many: `${subfolders} вложенных папок`,
							other: `${subfolders} вложенной папки`,
						})
					: null,
			].filter(Boolean);
			return `Удалить «${name}»${inside.length ? ` вместе с содержимым: ${inside.join(" и ")}` : ""}?`;
		},
	},
	history: {
		emptyTitle: "Истории пока нет",
		emptyBody:
			"Поиски, которые вы выполняете на торговом сайте, отображаются здесь.",
		clear: "Очистить историю",
		saveAs: (title: string) => `Сохранить ${title} в закладки`,
	},
	watchers: {
		emptyTitle: "Слежки нет",
		emptyBody:
			"Нажмите «Следить» у результата или значок глаза у закладки, и Exile Ledger будет проверять это в фоне.",
		needsAccess:
			"Для фоновых проверок нужно разрешение на доступ к торговому сайту. Дайте его на странице настроек.",
		allow: "Открыть настройки",
		listings: "Лоты",
		searches: "Поиски",
		status: {
			listed: "В продаже",
			gone: "Продан или снят",
			back: "Снова в продаже",
		} satisfies Record<ListingWatcher["status"], string>,
		repriced: (from: string, to: string) => `${from} → ${to}`,
		noPrice: "Без цены",
		notChecked: "Ещё не проверялось",
		checked: (ago: string) => `проверено ${ago}`,
		retrying: "Торговый сайт занят, повторим позже",
		newResults: (n: number) => `${number(n)} нов.`,
		total: (n: number) => results(n),
		remove: (name: string) => `Прекратить слежку: ${name}`,
		every: (minutes: number) => `каждые ${minutes} мин`,
	},
	notices: {
		goneTitle: (name: string) => `${name}: лот исчез`,
		goneBody: (seller: string) =>
			seller ? `Продан или снят продавцом ${seller}.` : "Продан или снят.",
		backTitle: (name: string) => `${name}: снова в продаже`,
		repricedTitle: (name: string) => `${name}: цена изменилась`,
		newTitle: (name: string) => `Новые результаты: ${name}`,
		moreTitle: (n: number) =>
			plural(locale, n, {
				one: `Ещё ${number(n)} изменение в слежке`,
				few: `Ещё ${number(n)} изменения в слежке`,
				many: `Ещё ${number(n)} изменений в слежке`,
				other: `Ещё ${number(n)} изменения в слежке`,
			}),
		moreBody:
			"Откройте вкладку «Слежка» в панели Exile Ledger, чтобы увидеть все.",
	},
	pins: {
		emptyTitle: "Ничего не закреплено",
		emptyBody:
			"Нажмите «Закрепить» у результата, чтобы он остался здесь, пока вы продолжаете поиск.",
		gone: "Больше нет на этой странице",
		noPrice: "Без цены",
		unpin: (name: string) => `Открепить ${name}`,
	},
	trade: {
		watch: "Следить",
		watching: "Слежка",
		watchTitle:
			"Проверяет этот лот в фоне и сообщает, когда изменится цена или он будет продан",
		pin: "Закрепить",
		unpin: "Открепить",
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		stackValue: (stackSize: number, parts: string[]) =>
			`Стопка из ${stackSize} стоит ≈ ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		listedAt: (at: number) =>
			`Выставлено ${new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`,
		affixes: (prefixes: number, suffixes: number) =>
			`${prefixes}П · ${suffixes}С`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { one: `${prefixes} префикс`, few: `${prefixes} префикса`, many: `${prefixes} префиксов`, other: `${prefixes} префикса` })}, ${plural(locale, suffixes, { one: `${suffixes} суффикс`, few: `${suffixes} суффикса`, many: `${suffixes} суффиксов`, other: `${suffixes} суффикса` })}`,
		copyItem: "Копировать предмет",
		copyItemTitle:
			"Копирует предмет как игровой текст, для Path of Building или поиска вставкой на торговом сайте",
		copied: "Скопировано",
		copyFailed: "Не удалось скопировать",
		wiki: "Вики",
		wikiTitle: (page: string) => `Открыть ${page} на вики`,
		socketShortfall: (itemLevel: number, max: number) =>
			`Уровень предмета ${itemLevel}: максимум гнёзд ${max}`,
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "Камни Усиления",
			enlighten: "Камни Просветления",
			enhance: "Камни Улучшения",
			awakened: "Пробуждённые камни",
			any: "Камни",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "Шлемы, перчатки и ботинки",
			shields: "Щиты",
			"one-handed": "Одноручное оружие",
			any: "Предметы",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems}: максимальный уровень ${maxLevel}, и то только у осквернённых. Минимум ${wanted} недостижим.`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems}: уровень выше ${maxLevel} достигается только осквернением, но этот поиск исключает осквернённые предметы. ${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems}: максимальное качество ${maxQuality}%, и то только у осквернённых. Минимум ${wanted}% недостижим.`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems}: качество выше ${maxQuality}% достигается только осквернением, но этот поиск исключает осквернённые предметы. ${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items}: максимальное число гнёзд ${max}, поэтому минимум ${wanted} недостижим.`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items}: максимальное число гнёзд ${max}, поэтому минимум ${wanted} связей недостижим.`,
		mirroredAndCorrupted:
			"Осквернённые предметы нельзя отразить, а отражённые нельзя осквернить. Установите «Любой» для одного из параметров: «Отражён» или «Осквернён».",
		fracturedUnique:
			"Уникальные предметы никогда не бывают расколотыми. Установите «Расколот» в значение «Любой» или выберите другую редкость.",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter}: минимум ${min} больше максимума ${max}.`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`В группе модификаторов минимум количества или суммы (${min}) больше максимума (${max}).`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`В фильтре модификатора минимум (${min}) больше максимума (${max}).`,
	},
	sync: {
		off: "Синхронизация выключена. Закладки остаются на этом компьютере.",
		on: (ago: string | null, percent: number) =>
			`Синхронизировано${ago ? ` ${ago}` : ""} · занято ${percent}% места синхронизации`,
		waiting: "Другой браузер сейчас записывает данные, скоро повторим.",
		quota:
			"Слишком много закладок для синхронизации браузера. Ваши закладки в безопасности на этом компьютере; заархивируйте или удалите часть, чтобы возобновить синхронизацию.",
		newer:
			"Другой браузер синхронизировался с более новой версией Exile Ledger. Обновите расширение здесь, чтобы возобновить синхронизацию; закладки на этом компьютере в сохранности.",
		failed: "Не удалось синхронизировать.",
	},
	imports: {
		title: "Резервные копии и обмен",
		description:
			"Импорт всегда добавляет новые папки рядом с вашими. Всё, что у вас уже есть, не меняется и не удаляется.",
		backupLabel: "Сохранить всё",
		backupHint:
			"Файл со всеми папками, закладками и настройками. История остаётся на этом компьютере.",
		saveBackup: "Сохранить файл копии",
		restoreLabel: "Восстановить из файла копии",
		restoreHint: "Выберите файл, сохранённый Exile Ledger.",
		chooseFile: "Выбрать файл",
		shareLabel: "Импортировать общую папку",
		shareHint:
			"Вставьте строку, скопированную через «Скопировать строку для обмена» у папки в панели, либо экспорт из Better Trading, Poe Trade Plus или TFT.",
		shareInput: "Строка для обмена",
		sharePlaceholder: "EL1:…",
		read: "Прочитать",
		restoreSettings: "Также восстановить настройки",
		import: "Импортировать",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)} и ${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `Копия сохранена: ${summary}.`,
		imported: (summary: string) => `Импортировано: ${summary}.`,
		backupFrom: (exportedAt: number, summary: string) =>
			`Копия от ${new Date(exportedAt).toLocaleString(locale)}: ${summary}.`,
		fromSource: (source: string, summary: string) => `${source}: ${summary}.`,
		saveFailed:
			"Не удалось сохранить импорт. Перезагрузите страницу и повторите попытку.",
		sources: {
			"exile-ledger": "Общая папка",
			"better-trading": "Экспорт Better Trading",
			"poe-trade-plus": "Экспорт Poe Trade Plus",
			tft: "Экспорт TFT Trade Extension",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "Это не строка для обмена Exile Ledger.",
			"share-damaged": "Строка для обмена повреждена или неполна.",
			"share-empty": "В строке для обмена нет папок.",
			"not-backup": "Этот файл не является копией Exile Ledger или повреждён.",
			"unknown-format":
				"Это не экспорт Exile Ledger, Better Trading или Poe Trade Plus.",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Настройки Exile Ledger",
		versionLine: (version: string) => `Настройки · версия ${version}`,
		panel: {
			title: "Панель",
			description: "Как панель располагается на торговом сайте.",
			side: "Сторона закрепления",
			sides: { left: "Слева", right: "Справа" },
			layout: "Расположение",
			layoutHint:
				"Поверх страницы или со сдвигом страницы, чтобы панель не закрывала результаты.",
			modes: { overlay: "Поверх", push: "Со сдвигом" },
			width: "Ширина",
			widthHintPercent: (minPx: number, maxPx: number) =>
				`Процент от ширины окна браузера: панель растёт и сжимается вместе с окном. Она никогда не бывает уже ${minPx} px или шире ${maxPx} px. Также можно перетащить внутренний край панели.`,
			widthHintPx: (minPx: number, maxPx: number) =>
				`Фиксированная ширина в пикселях, от ${minPx} до ${maxPx} px, независимо от размера окна. Также можно перетащить внутренний край панели.`,
			widthUnit: "Единица ширины",
			widthUnits: { percent: "%", px: "px" } satisfies Record<
				PanelWidthUnit,
				string
			>,
			widthInput: "Ширина панели",
		},
		appearance: {
			title: "Внешний вид",
			description:
				"Цвета панели, этой страницы и отметок, которые Exile Ledger добавляет к результатам торговли.",
			theme: "Тема",
			themes: {
				gold: "Тёмное золото",
				blood: "Кровь",
				verdant: "Зелень",
				azure: "Лазурь",
				bone: "Кость",
			} satisfies Record<ThemeId, string>,
			language: "Язык",
			languageHint:
				"Языки, кроме английского, переведены автоматически. Исправления от носителей языка приветствуются на GitHub.",
			languageAuto: "Как в браузере",
			compact: "Компактный режим",
			compactHint: "Строки в панели ниже, чтобы вмещалось больше закладок.",
		},
		sync: {
			title: "Синхронизация",
			description:
				"Закладки и папки следуют за вами через аккаунт браузера. История остаётся на каждом компьютере.",
			toggle: "Синхронизировать закладки",
			space: "Место синхронизации",
		},
		results: {
			title: "Результаты",
			description: "Дополнения к списку результатов торгового сайта.",
			highlight: "Подсвечивать искомые модификаторы",
			highlightHint:
				"Отмечает в каждом результате строки модификаторов, по которым вы фильтровали поиск.",
			prices: "Эквивалентные цены",
			pricesHint:
				"Показывает каждую цену в хаосах и божественных (PoE1) или в возвышенных и божественных (PoE2) по курсам poe.ninja, обновляемым каждые 30 минут. При включении запрашивается разрешение на чтение poe.ninja.",
			pricesMissingAccess:
				"Эквивалентные цены включены в другом браузере, но этому браузеру не разрешено читать poe.ninja. Включите переключатель, чтобы разрешить.",
			listingTime: "Точное время выставления",
			listingTimeHint:
				"Показывает дату и время выставления каждого предмета рядом с надписью сайта вроде «2 часа назад».",
			affixCount: "Число префиксов и суффиксов",
			affixCountHint:
				"Показывает, сколько префиксов и суффиксов у каждого предмета, по уровням модификаторов, которые присылает сайт.",
			itemTools: "Копирование предмета и ссылка на вики",
			itemToolsHint:
				"Добавляет кнопку, копирующую предмет как игровой текст, и ссылку на страницу предмета в вики.",
			socketWarning: "Предупреждение о гнёздах (PoE1)",
			socketWarningHint:
				"Отмечает предметы, у которых уровень предмета не позволяет достичь числа гнёзд базы, например базу с 6 гнёздами, у которой их никогда не будет 6.",
			pricesDenied:
				"Для эквивалентных цен нужен доступ к poe.ninja. Ничего не изменено.",
		},
		trade: {
			title: "Торговый сайт",
			tabTitles: "Заголовки вкладок",
			tabTitlesHint:
				"Помещает во вкладку браузера название закладки либо предмет и лигу, со знаком ⚡ для живых поисков.",
			fuzzy: "Нечёткий поиск предметов",
			fuzzyHint:
				"Добавляет ~, когда вы начинаете вводить текст в поле поиска предметов. Начните с пробела для точного поиска.",
			fuzzyFilters: "Нечёткий поиск фильтров модификаторов",
			fuzzyFiltersHint: "То же для полей выбора фильтра модификатора.",
			backForward: "Назад и вперёд между поисками",
			backForwardHint:
				"Кнопка «Назад» в браузере возвращает к предыдущему поиску, а не уводит с сайта.",
		},
		watchers: {
			title: "Слежка",
			description:
				"Лоты и поиски под слежкой проверяются в фоне, не чаще, чем позволяют лимиты запросов GGG.",
			access: "Доступ к торговому сайту",
			accessHint:
				"Нужен для фоновых проверок. Браузер спросит один раз; запросы идут только на официальный торговый сайт.",
			allowed: "Разрешено",
			allow: "Разрешить",
			denied:
				"Не разрешено. Слежка остаётся на паузе, пока вы не дадите доступ.",
			interval: "Проверять каждые",
			intervalHint: (min: number) =>
				`Минут между проверками для новых слежек, не меньше ${min}. После каждой неудачной проверки пауза удваивается.`,
			intervalInput: "Минут между проверками",
			notify: "Уведомления",
			notifyHint:
				"Уведомление браузера, когда лот под слежкой продан, вернулся в продажу или изменил цену, либо у поиска под слежкой появились новые результаты. При включении разрешение запрашивается один раз.",
			notifyMissingAccess:
				"Уведомления включены в другом браузере, но этот их не разрешил. Включите переключатель, чтобы разрешить их здесь.",
			notifyDenied:
				"Для уведомлений нужно разрешение браузера. Ничего не изменено.",
		},
		hotkeys: {
			title: "Горячие клавиши",
			description:
				"На торговом сайте. Сочетания для поля поиска работают и во время набора текста в нём.",
			actions: {
				togglePanel: "Показать или скрыть панель",
				focusItemSearch: "Перейти к поиску предметов",
				addStatFilter: "Добавить фильтр модификатора",
				clearSearch: "Очистить поиск",
				focusMin: "Перейти к минимуму фильтра модификатора",
				focusMax: "Перейти к максимуму фильтра модификатора",
			} satisfies Record<HotkeyAction, string>,
			unbound: "Не задано",
			recording: "Нажмите клавиши",
			recordingHint: "Нажмите новое сочетание или Escape для отмены.",
			change: (action: string) => `Изменить сочетание: ${action}`,
			remove: (action: string) => `Удалить сочетание: ${action}`,
			reset: "Сбросить по умолчанию",
			reserved: (combo: string) =>
				`${combo} является сочетанием браузера. Выберите другое.`,
			taken: (combo: string, action: string) =>
				`${combo} уже используется для «${action}».`,
		},
		history: {
			title: "История",
			record: "Записывать поиски",
			recordHint: "Хранится только на этом компьютере, до 200 на игру.",
			clearAll: "Очистить всю историю",
			clearAllHint: "Обе игры, на этом компьютере.",
			clear: "Очистить историю",
			cleared: "История очищена.",
		},
		about: {
			title: "О расширении и конфиденциальность",
			body: "Exile Ledger хранит ваши закладки в браузере и синхронизирует их через аккаунт браузера. Он ничего не отправляет в другие места: ни аналитики, ни слежения, и он никогда не читает вашу сессию Path of Exile. Он видит только торговые поиски, которые делает ваша собственная страница.",
		},
	},
	popup: {
		version: (version: string) => `Версия ${version}`,
		body: "Панель находится на торговом сайте. Настройки, резервные копии и импорт находятся на странице настроек.",
		openSettings: "Открыть настройки",
	},
};
