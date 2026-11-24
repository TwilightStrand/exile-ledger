import type { ImportError } from "../exchange";
import type { HotkeyAction } from "../hotkeys";
import type { ImportSource } from "../importers";
import type { FolderIcon } from "../model";
import type { GemKind, SocketItemKind } from "../searchChecks";
import type { ThemeId } from "../themes";
import type { Game } from "../tradeUrl";
import type { ListingWatcher } from "../watchers";
import type { Messages } from "./en";
import { plural } from "./plural";

const locale = "es";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) =>
	plural(locale, n, {
		one: `${n} marcador`,
		many: `${n} marcadores`,
		other: `${n} marcadores`,
	});

const folders = (n: number) =>
	plural(locale, n, {
		one: `${n} carpeta`,
		many: `${n} carpetas`,
		other: `${n} carpetas`,
	});

const results = (n: number) =>
	plural(locale, n, {
		one: `${number(n)} resultado`,
		many: `${number(n)} resultados`,
		other: `${number(n)} resultados`,
	});

const fixCorrupted = "Cambia Corrupto a Cualquiera o Sí.";

export const es: Messages = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "Cualquier objeto",
		cancel: "Cancelar",
		delete: "Eliminar",
		keep: "Conservar",
		liveSearch: "Búsqueda en vivo",
		savedToBookmarks: "Guardado en marcadores",
		results,
	},
	time: {
		justNow: "ahora mismo",
		minutesAgo: (n: number) => `hace ${n} min`,
		hoursAgo: (n: number) => `hace ${n} h`,
		yesterday: "ayer",
		daysAgo: (n: number) => `hace ${n} d`,
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "Cambiar el tamaño del panel",
		resizeValue: (percent: number) => `${percent}% de la ventana`,
		collapse: "Contraer Exile Ledger",
		expand: "Expandir Exile Ledger",
		expandTab: "Ledger",
		sections: "Secciones del panel",
		tabs: {
			bookmarks: "Marcadores",
			history: "Historial",
			pinned: "Fijados",
			watchers: "Vigilar",
		},
	},
	currentSearch: {
		heading: "Búsqueda actual",
		problems: "Problemas de la búsqueda",
		save: "Guardar búsqueda",
		empty: "Haz una búsqueda en el sitio de comercio y aparecerá aquí.",
	},
	bookmarks: {
		defaultFolder: "Búsquedas guardadas",
		nav: "Marcadores",
		emptyTitle: "Aún no hay marcadores",
		emptyBody:
			"Guarda una búsqueda para tenerla aquí. Las carpetas se sincronizan con tus otros navegadores.",
		newFolder: "Nueva carpeta",
		newFolderName: "Nombre de la nueva carpeta",
		folderNamePlaceholder: "Nombre de la carpeta",
		folderName: "Nombre de la carpeta",
		bookmarkName: "Nombre del marcador",
		archived: "Archivados",
		folderIcon: "Icono de la carpeta",
		folderIcons: {
			folder: "Carpeta",
			sword: "Espada",
			bow: "Arco",
			shield: "Escudo",
			helmet: "Yelmo",
			ring: "Anillo",
			amulet: "Amuleto",
			gem: "Gema",
			flask: "Frasco",
			map: "Mapa",
			coin: "Moneda",
			star: "Estrella",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `Renombrar ${name}`,
		delete: (name: string) => `Eliminar ${name}`,
		archive: (name: string) => `Archivar ${name}`,
		restore: (name: string) => `Restaurar ${name}`,
		newFolderIn: (name: string) => `Nueva carpeta en ${name}`,
		changeIcon: (name: string) => `Cambiar el icono de ${name}`,
		copyShareFor: (name: string) =>
			`Copiar la cadena para compartir de ${name}`,
		copyShare: "Copiar cadena para compartir",
		shareCopied: "Cadena para compartir copiada",
		copied: "Copiado",
		overwrite: (name: string) => `Reemplazar ${name} por la búsqueda actual`,
		confirmOverwrite: (name: string) =>
			`¿Reemplazar «${name}» por la búsqueda actual?`,
		replace: "Reemplazar",
		watch: (name: string) => `Vigilar ${name} por si hay resultados nuevos`,
		unwatch: (name: string) =>
			`Dejar de vigilar ${name} por si hay resultados nuevos`,
		markDone: (name: string) => `Marcar ${name} como hecho`,
		markNotDone: (name: string) => `Marcar ${name} como pendiente`,
		done: "Hecho",
		more: (name: string) => `Más opciones para ${name}`,
		allDone: "Marcar todo como hecho",
		allNotDone: "Marcar todo como pendiente",
		changeLeague: "Cambiar de liga",
		league: "Liga",
		leaguePlaceholder: "Nombre de la liga, p. ej. Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `Todo lo de aquí ya estaba en ${league}.`
				: `Se movieron ${bookmarks(n)} a ${league}.`,
		confirmDeleteBookmark: (name: string) => `¿Eliminar «${name}»?`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							one: `${subfolders} subcarpeta`,
							many: `${subfolders} subcarpetas`,
							other: `${subfolders} subcarpetas`,
						})
					: null,
			].filter(Boolean);
			return `¿Eliminar «${name}»${inside.length ? ` y sus ${inside.join(" y ")}` : ""}?`;
		},
	},
	history: {
		emptyTitle: "Aún no hay historial",
		emptyBody: "Las búsquedas que hagas en el sitio de comercio aparecen aquí.",
		clear: "Borrar historial",
		saveAs: (title: string) => `Guardar ${title} como marcador`,
	},
	watchers: {
		emptyTitle: "Nada vigilado",
		emptyBody:
			"Usa Vigilar en un resultado, o el ojo de un marcador, y Exile Ledger lo comprobará en segundo plano.",
		needsAccess:
			"Las comprobaciones en segundo plano necesitan permiso para acceder al sitio de comercio. Permítelo en la página de ajustes.",
		allow: "Abrir ajustes",
		listings: "Anuncios",
		searches: "Búsquedas",
		status: {
			listed: "En venta",
			gone: "Vendido o retirado",
			back: "En venta de nuevo",
		} satisfies Record<ListingWatcher["status"], string>,
		repriced: (from: string, to: string) => `${from} → ${to}`,
		noPrice: "Sin precio",
		notChecked: "Aún sin comprobar",
		checked: (ago: string) => `comprobado ${ago}`,
		retrying: "Sitio de comercio ocupado, se reintentará más tarde",
		newResults: (n: number) =>
			plural(locale, n, {
				one: `${number(n)} nuevo`,
				many: `${number(n)} nuevos`,
				other: `${number(n)} nuevos`,
			}),
		total: (n: number) => results(n),
		remove: (name: string) => `Dejar de vigilar ${name}`,
		every: (minutes: number) => `cada ${minutes} min`,
	},
	notices: {
		goneTitle: (name: string) => `${name} ya no está`,
		goneBody: (seller: string) =>
			seller ? `Vendido o retirado por ${seller}.` : "Vendido o retirado.",
		backTitle: (name: string) => `${name} está en venta de nuevo`,
		repricedTitle: (name: string) => `${name} cambió de precio`,
		newTitle: (name: string) => `Resultados nuevos para ${name}`,
	},
	pins: {
		emptyTitle: "Nada fijado",
		emptyBody:
			"Usa Fijar en un resultado para conservarlo aquí mientras sigues buscando.",
		gone: "Ya no está en esta página",
		noPrice: "Sin precio",
		unpin: (name: string) => `Desfijar ${name}`,
	},
	trade: {
		watch: "Vigilar",
		watching: "Vigilando",
		watchTitle:
			"Comprueba este anuncio en segundo plano y te avisa cuando cambia su precio o se vende",
		pin: "Fijar",
		unpin: "Desfijar",
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		stackValue: (stackSize: number, parts: string[]) =>
			`Pila de ${stackSize} vale ≈ ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		listedAt: (at: number) =>
			`En venta desde ${new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`,
		affixes: (prefixes: number, suffixes: number) =>
			`${prefixes}P · ${suffixes}S`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { one: `${prefixes} prefijo`, many: `${prefixes} prefijos`, other: `${prefixes} prefijos` })}, ${plural(locale, suffixes, { one: `${suffixes} sufijo`, many: `${suffixes} sufijos`, other: `${suffixes} sufijos` })}`,
		copyItem: "Copiar objeto",
		copyItemTitle:
			"Copia el objeto como texto del juego, para Path of Building o la búsqueda por pegado del sitio de comercio",
		copied: "Copiado",
		copyFailed: "No se pudo copiar",
		wiki: "Wiki",
		wikiTitle: (page: string) => `Abrir ${page} en la wiki`,
		socketShortfall: (itemLevel: number, max: number) =>
			`Nivel de objeto ${itemLevel}: como máximo ${max} engarces`,
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "Gemas Empower",
			enlighten: "Gemas Enlighten",
			enhance: "Gemas Enhance",
			awakened: "Gemas despertadas",
			any: "Gemas",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "Yelmos, guantes y botas",
			shields: "Escudos",
			"one-handed": "Armas a una mano",
			any: "Objetos",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems} llegan como máximo al nivel ${maxLevel}, y solo si están corruptas. Nada puede cumplir un mínimo de ${wanted}.`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems} solo superan el nivel ${maxLevel} al corromperse, pero esta búsqueda excluye los objetos corruptos. ${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems} llegan como máximo al ${maxQuality}% de calidad, y solo si están corruptas. Nada puede cumplir un mínimo del ${wanted}%.`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems} solo superan el ${maxQuality}% de calidad al corromperse, pero esta búsqueda excluye los objetos corruptos. ${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} tienen como máximo ${max} engarces, así que nada puede cumplir un mínimo de ${wanted} engarces.`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} tienen como máximo ${max} engarces, así que nada puede cumplir un mínimo de ${wanted} enlaces.`,
		mirroredAndCorrupted:
			"Los objetos corruptos no se pueden reflejar, y los objetos reflejados no se pueden corromper. Pon Reflejado o Corrupto en Cualquiera.",
		fracturedUnique:
			"Los objetos únicos nunca están fracturados. Pon Fracturado en Cualquiera o elige otra rareza.",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter} tiene un mínimo de ${min} por encima de su máximo de ${max}.`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`El recuento o el total de un grupo de atributos tiene un mínimo de ${min} por encima de su máximo de ${max}.`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`Un filtro de atributos tiene un mínimo de ${min} por encima de su máximo de ${max}.`,
	},
	sync: {
		off: "La sincronización está desactivada. Los marcadores se quedan en este equipo.",
		on: (ago: string | null, percent: number) =>
			`Sincronizado${ago ? ` ${ago}` : ""} · ${percent}% del espacio de sincronización usado`,
		waiting: "Otro navegador está escribiendo; se reintentará en breve.",
		quota:
			"Demasiados marcadores para la sincronización del navegador. Tus marcadores están a salvo en este equipo; archiva o elimina algunos para reanudar la sincronización.",
		failed: "Error de sincronización.",
	},
	imports: {
		title: "Copia de seguridad y compartir",
		description:
			"Las importaciones siempre añaden carpetas nuevas junto a las tuyas. No se cambia ni se elimina nada de lo que ya tienes.",
		backupLabel: "Copia de seguridad de todo",
		backupHint:
			"Un archivo con todas las carpetas, marcadores y ajustes. El historial se queda en este equipo.",
		saveBackup: "Guardar archivo de copia",
		restoreLabel: "Restaurar desde un archivo de copia",
		restoreHint: "Elige un archivo guardado por Exile Ledger.",
		chooseFile: "Elegir archivo",
		shareLabel: "Importar una carpeta compartida",
		shareHint:
			"Pega una cadena copiada con «Copiar cadena para compartir» en una carpeta del panel, o una exportación de Better Trading, Poe Trade Plus o TFT.",
		shareInput: "Cadena para compartir",
		sharePlaceholder: "EL1:…",
		read: "Leer",
		restoreSettings: "Restaurar también los ajustes",
		import: "Importar",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)} y ${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `Copia guardada con ${summary}.`,
		imported: (summary: string) => `Importado: ${summary}.`,
		backupFrom: (exportedAt: number, summary: string) =>
			`Copia del ${new Date(exportedAt).toLocaleString(locale)}: ${summary}.`,
		fromSource: (source: string, summary: string) => `${source}: ${summary}.`,
		saveFailed:
			"No se pudo guardar la importación. Recarga esta página e inténtalo de nuevo.",
		sources: {
			"exile-ledger": "Carpeta compartida",
			"better-trading": "Exportación de Better Trading",
			"poe-trade-plus": "Exportación de Poe Trade Plus",
			tft: "Exportación de TFT Trade Extension",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "Esto no es una cadena para compartir de Exile Ledger.",
			"share-damaged": "La cadena para compartir está dañada o incompleta.",
			"share-empty": "La cadena para compartir no contiene carpetas.",
			"not-backup":
				"Este archivo no es una copia de seguridad de Exile Ledger, o está dañado.",
			"unknown-format":
				"Esto no es una exportación de Exile Ledger, Better Trading ni Poe Trade Plus.",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Ajustes de Exile Ledger",
		versionLine: (version: string) => `Ajustes · versión ${version}`,
		panel: {
			title: "Panel",
			description: "Cómo se coloca el panel en el sitio de comercio.",
			side: "Lado de anclaje",
			sides: { left: "Izquierda", right: "Derecha" },
			layout: "Disposición",
			layoutHint:
				"Flotar sobre la página, o empujarla a un lado para que el panel nunca tape los resultados.",
			modes: { overlay: "Flotar encima", push: "Empujar a un lado" },
			width: "Anchura",
			widthHint: (minPx: number, maxPx: number) =>
				`Proporción de la ventana del navegador, entre ${minPx} y ${maxPx} px. También puedes arrastrar el borde interior del panel.`,
			widthInput: "Anchura del panel",
		},
		appearance: {
			title: "Apariencia",
			description:
				"Colores del panel, de esta página y de las marcas que Exile Ledger añade a los resultados del comercio.",
			theme: "Tema",
			themes: {
				gold: "Oro oscuro",
				blood: "Sangre",
				verdant: "Verdor",
				azure: "Azur",
				bone: "Hueso",
			} satisfies Record<ThemeId, string>,
			language: "Idioma",
			languageHint:
				"Los idiomas distintos del inglés se tradujeron automáticamente. Las correcciones de hablantes nativos son bienvenidas en GitHub.",
			languageAuto: "Igual que el navegador",
			compact: "Modo compacto",
			compactHint:
				"Filas más bajas en el panel, para que quepan más marcadores.",
		},
		sync: {
			title: "Sincronización",
			description:
				"Los marcadores y las carpetas te siguen a través de la cuenta de tu navegador. El historial se queda en cada equipo.",
			toggle: "Sincronizar marcadores",
			space: "Espacio de sincronización",
		},
		results: {
			title: "Resultados",
			description:
				"Añadidos a la lista de resultados propia del sitio de comercio.",
			highlight: "Resaltar modificadores buscados",
			highlightHint:
				"Marca las líneas de modificadores de cada resultado por las que filtró tu búsqueda.",
			prices: "Precios equivalentes",
			pricesHint:
				"Muestra cada precio en caos y divine (PoE1) o exalted y divine (PoE2), con las tasas de poe.ninja actualizadas cada 30 minutos. Al activarlo se pide permiso para leer poe.ninja.",
			pricesMissingAccess:
				"Los precios equivalentes están activados en otro navegador, pero este no tiene permiso para leer poe.ninja. Activa el interruptor para permitirlo.",
			listingTime: "Hora exacta del anuncio",
			listingTimeHint:
				"Muestra la fecha y la hora en que se publicó cada objeto, junto al «hace 2 horas» del sitio.",
			affixCount: "Recuento de prefijos y sufijos",
			affixCountHint:
				"Muestra cuántos prefijos y sufijos tiene cada objeto, a partir de los rangos de modificadores que envía el sitio.",
			itemTools: "Copiar objeto y enlace a la wiki",
			itemToolsHint:
				"Añade un botón que copia el objeto como texto del juego, y un enlace a la página del objeto en la wiki.",
			socketWarning: "Aviso de engarces (PoE1)",
			socketWarningHint:
				"Avisa de los objetos cuyo nivel de objeto los deja por debajo del número de engarces de la base, por ejemplo una base de 6 engarces que nunca podrá tener 6.",
			pricesDenied:
				"Los precios equivalentes necesitan acceso a poe.ninja. No se cambió nada.",
		},
		trade: {
			title: "Sitio de comercio",
			tabTitles: "Títulos de pestaña",
			tabTitlesHint:
				"Pone en la pestaña del navegador el nombre del marcador, o el objeto y la liga, con ⚡ para las búsquedas en vivo.",
			fuzzy: "Búsqueda difusa de objetos",
			fuzzyHint:
				"Añade ~ cuando empiezas a escribir en el cuadro de búsqueda de objetos. Empieza con un espacio para buscar exactamente.",
			fuzzyFilters: "Búsqueda difusa de filtros de atributos",
			fuzzyFiltersHint:
				"Lo mismo para los cuadros donde eliges un filtro de atributos.",
			backForward: "Atrás y Adelante entre búsquedas",
			backForwardHint:
				"El botón Atrás del navegador vuelve a tu búsqueda anterior en lugar de salir del sitio.",
		},
		watchers: {
			title: "Vigilantes",
			description:
				"Los anuncios y las búsquedas vigilados se comprueban en segundo plano, como mucho con la frecuencia que permitan los límites de GGG.",
			access: "Acceso al sitio de comercio",
			accessHint:
				"Necesario para las comprobaciones en segundo plano. Tu navegador lo pregunta una vez; las peticiones van solo al sitio de comercio oficial.",
			allowed: "Permitido",
			allow: "Permitir",
			denied:
				"No permitido. Los vigilantes quedan en pausa hasta que lo permitas.",
			interval: "Comprobar cada",
			intervalHint: (min: number) =>
				`Minutos entre comprobaciones de los vigilantes nuevos, ${min} como mínimo. Cada comprobación fallida espera el doble que la anterior.`,
			intervalInput: "Minutos entre comprobaciones",
			notify: "Notificaciones",
			notifyHint:
				"Una notificación del navegador cuando un anuncio vigilado se vende, vuelve o cambia de precio, o cuando una búsqueda vigilada tiene resultados nuevos. Al activarlo se pide permiso una vez.",
			notifyDenied:
				"Las notificaciones necesitan el permiso de tu navegador. No se cambió nada.",
		},
		hotkeys: {
			title: "Atajos de teclado",
			description:
				"En el sitio de comercio. Los atajos del cuadro de búsqueda también funcionan mientras escribes en uno.",
			actions: {
				togglePanel: "Mostrar u ocultar el panel",
				focusItemSearch: "Ir a la búsqueda de objetos",
				addStatFilter: "Añadir un filtro de atributos",
				clearSearch: "Borrar la búsqueda",
				focusMin: "Ir al mínimo del filtro de atributos",
				focusMax: "Ir al máximo del filtro de atributos",
			} satisfies Record<HotkeyAction, string>,
			unbound: "Sin asignar",
			recording: "Pulsa teclas",
			recordingHint: "Pulsa el nuevo atajo, o Escape para cancelar.",
			change: (action: string) => `Cambiar el atajo de ${action}`,
			remove: (action: string) => `Quitar el atajo de ${action}`,
			reset: "Restablecer valores por defecto",
			reserved: (combo: string) =>
				`${combo} es un atajo del navegador. Elige otro.`,
			taken: (combo: string, action: string) =>
				`${combo} ya se usa para «${action}».`,
		},
		history: {
			title: "Historial",
			record: "Registrar búsquedas",
			recordHint: "Se guarda solo en este equipo, hasta 200 por juego.",
			clearAll: "Borrar todo el historial",
			clearAllHint: "Ambos juegos, en este equipo.",
			clear: "Borrar historial",
			cleared: "Historial borrado.",
		},
		about: {
			title: "Acerca de y privacidad",
			body: "Exile Ledger guarda tus marcadores en tu navegador y los sincroniza a través de la cuenta de tu navegador. No envía nada a ningún otro sitio: ni analítica ni seguimiento, y nunca lee tu sesión de Path of Exile. Solo ve las búsquedas de comercio que hace tu propia página.",
		},
	},
	popup: {
		version: (version: string) => `Versión ${version}`,
		body: "El panel vive en el sitio de comercio. Los ajustes, las copias de seguridad y las importaciones están en la página de ajustes.",
		openSettings: "Abrir ajustes",
	},
};
