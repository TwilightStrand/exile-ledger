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

const locale = "fr";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) =>
	plural(locale, n, { one: `${n} favori`, other: `${n} favoris` });

const folders = (n: number) =>
	plural(locale, n, { one: `${n} dossier`, other: `${n} dossiers` });

const results = (n: number) =>
	plural(locale, n, {
		one: `${number(n)} résultat`,
		other: `${number(n)} résultats`,
	});

const fixCorrupted = "Réglez « Corrompu » sur « Indifférent » ou « Oui ».";

export const fr: Messages = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "Tout objet",
		cancel: "Annuler",
		delete: "Supprimer",
		keep: "Garder",
		liveSearch: "Recherche en direct",
		savedToBookmarks: "Enregistré dans les favoris",
		results,
	},
	time: {
		justNow: "à l'instant",
		minutesAgo: (n: number) => `il y a ${n} min`,
		hoursAgo: (n: number) => `il y a ${n} h`,
		yesterday: "hier",
		daysAgo: (n: number) => `il y a ${n} j`,
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "Redimensionner le panneau",
		resizeValue: (percent: number) => `${percent} % de la fenêtre`,
		collapse: "Réduire Exile Ledger",
		expand: "Développer Exile Ledger",
		expandTab: "Ledger",
		sections: "Sections du panneau",
		tabs: {
			bookmarks: "Favoris",
			history: "Historique",
			pinned: "Épinglés",
			watchers: "Suivi",
		},
	},
	currentSearch: {
		heading: "Recherche actuelle",
		problems: "Problèmes de recherche",
		save: "Enregistrer la recherche",
		empty: "Lancez une recherche sur le site de commerce et elle apparaît ici.",
	},
	bookmarks: {
		defaultFolder: "Recherches enregistrées",
		nav: "Favoris",
		emptyTitle: "Aucun favori pour le moment",
		emptyBody:
			"Enregistrez une recherche pour la garder ici. Les dossiers se synchronisent avec vos autres navigateurs.",
		newFolder: "Nouveau dossier",
		newFolderName: "Nom du nouveau dossier",
		folderNamePlaceholder: "Nom du dossier",
		folderName: "Nom du dossier",
		bookmarkName: "Nom du favori",
		archived: "Archivés",
		folderIcon: "Icône du dossier",
		folderIcons: {
			folder: "Dossier",
			sword: "Épée",
			bow: "Arc",
			shield: "Bouclier",
			helmet: "Casque",
			ring: "Anneau",
			amulet: "Amulette",
			gem: "Gemme",
			flask: "Fiole",
			map: "Carte",
			coin: "Monnaie",
			star: "Étoile",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `Renommer ${name}`,
		delete: (name: string) => `Supprimer ${name}`,
		archive: (name: string) => `Archiver ${name}`,
		restore: (name: string) => `Restaurer ${name}`,
		newFolderIn: (name: string) => `Nouveau dossier dans ${name}`,
		changeIcon: (name: string) => `Changer l'icône de ${name}`,
		copyShareFor: (name: string) => `Copier la chaîne de partage de ${name}`,
		copyShare: "Copier la chaîne de partage",
		shareCopied: "Chaîne de partage copiée",
		copied: "Copié",
		overwrite: (name: string) => `Remplacer ${name} par la recherche actuelle`,
		confirmOverwrite: (name: string) =>
			`Remplacer « ${name} » par la recherche actuelle ?`,
		replace: "Remplacer",
		watch: (name: string) => `Suivre ${name} pour les nouveaux résultats`,
		unwatch: (name: string) =>
			`Ne plus suivre ${name} pour les nouveaux résultats`,
		markDone: (name: string) => `Marquer ${name} comme terminé`,
		markNotDone: (name: string) => `Marquer ${name} comme non terminé`,
		done: "Terminé",
		more: (name: string) => `Plus d'options pour ${name}`,
		allDone: "Tout marquer comme terminé",
		allNotDone: "Tout marquer comme non terminé",
		changeLeague: "Changer de ligue",
		league: "Ligue",
		leaguePlaceholder: "Nom de la ligue, p. ex. Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `Tout était déjà dans ${league}.`
				: `${bookmarks(n)} déplacé${n > 1 ? "s" : ""} vers ${league}.`,
		confirmDeleteBookmark: (name: string) => `Supprimer « ${name} » ?`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							one: `${subfolders} sous-dossier`,
							other: `${subfolders} sous-dossiers`,
						})
					: null,
			].filter(Boolean);
			return `Supprimer « ${name} »${inside.length ? ` et son contenu (${inside.join(" et ")})` : ""} ?`;
		},
	},
	history: {
		emptyTitle: "Aucun historique pour le moment",
		emptyBody:
			"Les recherches que vous lancez sur le site de commerce sont listées ici.",
		clear: "Effacer l'historique",
		saveAs: (title: string) => `Enregistrer ${title} comme favori`,
	},
	watchers: {
		emptyTitle: "Rien n'est suivi",
		emptyBody:
			"Utilisez Suivre sur un résultat, ou l'œil sur un favori, et Exile Ledger le vérifie en arrière-plan.",
		needsAccess:
			"Les vérifications en arrière-plan ont besoin de l'autorisation d'accéder au site de commerce. Autorisez-la dans la page des paramètres.",
		allow: "Ouvrir les paramètres",
		listings: "Annonces",
		searches: "Recherches",
		status: {
			listed: "En vente",
			gone: "Vendu ou retiré",
			back: "De nouveau en vente",
		} satisfies Record<ListingWatcher["status"], string>,
		repriced: (from: string, to: string) => `${from} → ${to}`,
		noPrice: "Pas de prix",
		notChecked: "Pas encore vérifié",
		checked: (ago: string) => `vérifié ${ago}`,
		retrying: "Site de commerce occupé, nouvel essai plus tard",
		newResults: (n: number) => `${number(n)} ${n > 1 ? "nouveaux" : "nouveau"}`,
		total: (n: number) => results(n),
		remove: (name: string) => `Ne plus suivre ${name}`,
		every: (minutes: number) => `toutes les ${minutes} min`,
	},
	notices: {
		goneTitle: (name: string) => `${name} a disparu`,
		goneBody: (seller: string) =>
			seller ? `Vendu ou retiré par ${seller}.` : "Vendu ou retiré.",
		backTitle: (name: string) => `${name} est de nouveau en vente`,
		repricedTitle: (name: string) => `Le prix de ${name} a changé`,
		newTitle: (name: string) => `Nouveaux résultats pour ${name}`,
	},
	pins: {
		emptyTitle: "Rien n'est épinglé",
		emptyBody:
			"Utilisez Épingler sur un résultat pour le garder ici pendant que vous continuez à chercher.",
		gone: "Plus sur cette page",
		noPrice: "Pas de prix",
		unpin: (name: string) => `Désépingler ${name}`,
	},
	trade: {
		watch: "Suivre",
		watching: "Suivi",
		watchTitle:
			"Vérifie cette annonce en arrière-plan et vous prévient quand son prix change ou qu'elle est vendue",
		pin: "Épingler",
		unpin: "Désépingler",
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		stackValue: (stackSize: number, parts: string[]) =>
			`Pile de ${stackSize} d'une valeur de ≈ ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		listedAt: (at: number) =>
			`Mis en vente ${new Date(at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}`,
		affixes: (prefixes: number, suffixes: number) =>
			`${prefixes}P · ${suffixes}S`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { one: `${prefixes} préfixe`, other: `${prefixes} préfixes` })}, ${plural(locale, suffixes, { one: `${suffixes} suffixe`, other: `${suffixes} suffixes` })}`,
		copyItem: "Copier l'objet",
		copyItemTitle:
			"Copie l'objet sous forme de texte du jeu, pour Path of Building ou la recherche par collage du site de commerce",
		copied: "Copié",
		copyFailed: "Échec de la copie",
		wiki: "Wiki",
		wikiTitle: (page: string) => `Ouvrir ${page} sur le wiki`,
		socketShortfall: (itemLevel: number, max: number) =>
			`Niveau d'objet ${itemLevel} : ${max} châsses au maximum`,
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "Gemmes Empower",
			enlighten: "Gemmes Enlighten",
			enhance: "Gemmes Enhance",
			awakened: "Gemmes éveillées",
			any: "Gemmes",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "Casques, gants et bottes",
			shields: "Boucliers",
			"one-handed": "Armes à une main",
			any: "Objets",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems} plafonnent au niveau ${maxLevel}, et seulement si elles sont corrompues. Rien ne peut correspondre à un minimum de ${wanted}.`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems} ne dépassent le niveau ${maxLevel} que par corruption, mais cette recherche exclut les objets corrompus. ${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems} plafonnent à ${maxQuality} % de qualité, et seulement si elles sont corrompues. Rien ne peut correspondre à un minimum de ${wanted} %.`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems} ne dépassent ${maxQuality} % de qualité que par corruption, mais cette recherche exclut les objets corrompus. ${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} ont au plus ${max} châsses, donc rien ne peut correspondre à un minimum de ${wanted} châsses.`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} ont au plus ${max} châsses, donc rien ne peut correspondre à un minimum de ${wanted} liens.`,
		mirroredAndCorrupted:
			"Les objets corrompus ne peuvent pas être en miroir, et les objets en miroir ne peuvent pas être corrompus. Réglez « Miroir » ou « Corrompu » sur « Indifférent ».",
		fracturedUnique:
			"Les objets uniques ne sont jamais fracturés. Réglez « Fracturé » sur « Indifférent » ou choisissez une autre rareté.",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter} a un minimum de ${min} supérieur à son maximum de ${max}.`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`Le nombre ou le total d'un groupe de stats a un minimum de ${min} supérieur à son maximum de ${max}.`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`Un filtre de stat a un minimum de ${min} supérieur à son maximum de ${max}.`,
	},
	sync: {
		off: "La synchronisation est désactivée. Les favoris restent sur cet appareil.",
		on: (ago: string | null, percent: number) =>
			`Synchronisé${ago ? ` ${ago}` : ""} · ${percent} % de l'espace de synchronisation utilisé`,
		waiting:
			"Un autre navigateur est en train d'écrire ; nouvel essai sous peu.",
		quota:
			"Trop de favoris pour la synchronisation du navigateur. Vos favoris sont en sécurité sur cet appareil ; archivez ou supprimez-en pour reprendre la synchronisation.",
		failed: "Échec de la synchronisation.",
	},
	imports: {
		title: "Sauvegarde et partage",
		description:
			"Les imports ajoutent toujours de nouveaux dossiers à côté des vôtres. Rien de ce que vous avez déjà n'est modifié ni supprimé.",
		backupLabel: "Tout sauvegarder",
		backupHint:
			"Un fichier avec tous les dossiers, favoris et paramètres. L'historique reste sur cet appareil.",
		saveBackup: "Enregistrer le fichier de sauvegarde",
		restoreLabel: "Restaurer depuis un fichier de sauvegarde",
		restoreHint: "Choisissez un fichier enregistré par Exile Ledger.",
		chooseFile: "Choisir un fichier",
		shareLabel: "Importer un dossier partagé",
		shareHint:
			"Collez une chaîne copiée avec « Copier la chaîne de partage » sur un dossier du panneau, ou un export de Better Trading, Poe Trade Plus ou TFT.",
		shareInput: "Chaîne de partage",
		sharePlaceholder: "EL1:…",
		read: "Lire",
		restoreSettings: "Restaurer aussi les paramètres",
		import: "Importer",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)} et ${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `Sauvegarde enregistrée avec ${summary}.`,
		imported: (summary: string) => `Importé : ${summary}.`,
		backupFrom: (exportedAt: number, summary: string) =>
			`Sauvegarde du ${new Date(exportedAt).toLocaleString(locale)} : ${summary}.`,
		fromSource: (source: string, summary: string) => `${source} : ${summary}.`,
		saveFailed:
			"Impossible d'enregistrer l'import. Rechargez cette page et réessayez.",
		sources: {
			"exile-ledger": "Dossier partagé",
			"better-trading": "Export Better Trading",
			"poe-trade-plus": "Export Poe Trade Plus",
			tft: "Export TFT Trade Extension",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "Ce n'est pas une chaîne de partage Exile Ledger.",
			"share-damaged": "La chaîne de partage est endommagée ou incomplète.",
			"share-empty": "La chaîne de partage ne contient aucun dossier.",
			"not-backup":
				"Ce fichier n'est pas une sauvegarde Exile Ledger, ou il est endommagé.",
			"unknown-format":
				"Ce n'est pas un export Exile Ledger, Better Trading ou Poe Trade Plus.",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Paramètres d'Exile Ledger",
		versionLine: (version: string) => `Paramètres · version ${version}`,
		panel: {
			title: "Panneau",
			description: "Comment le panneau se place sur le site de commerce.",
			side: "Côté d'ancrage",
			sides: { left: "Gauche", right: "Droite" },
			layout: "Disposition",
			layoutHint:
				"Flotter au-dessus de la page, ou repousser la page pour que le panneau ne couvre jamais les résultats.",
			modes: { overlay: "Flottant", push: "Repousser" },
			width: "Largeur",
			widthHint: (minPx: number, maxPx: number) =>
				`Part de la fenêtre du navigateur, entre ${minPx} et ${maxPx} px. Vous pouvez aussi faire glisser le bord intérieur du panneau.`,
			widthInput: "Largeur du panneau",
		},
		appearance: {
			title: "Apparence",
			description:
				"Couleurs du panneau, de cette page et des marques qu'Exile Ledger ajoute aux résultats de commerce.",
			theme: "Thème",
			themes: {
				gold: "Or sombre",
				blood: "Sang",
				verdant: "Verdoyant",
				azure: "Azur",
				bone: "Os",
			} satisfies Record<ThemeId, string>,
			language: "Langue",
			languageHint:
				"Les langues autres que l'anglais ont été traduites automatiquement. Les corrections de locuteurs natifs sont les bienvenues sur GitHub.",
			languageAuto: "Comme le navigateur",
			compact: "Mode compact",
			compactHint:
				"Lignes plus courtes dans le panneau, pour y faire tenir plus de favoris.",
		},
		sync: {
			title: "Synchronisation",
			description:
				"Les favoris et dossiers vous suivent via votre compte de navigateur. L'historique reste sur chaque appareil.",
			toggle: "Synchroniser les favoris",
			space: "Espace de synchronisation",
		},
		results: {
			title: "Résultats",
			description: "Ajouts à la liste de résultats du site de commerce.",
			highlight: "Surligner les modificateurs recherchés",
			highlightHint:
				"Marque les lignes de modificateurs de chaque résultat sur lesquelles votre recherche a filtré.",
			prices: "Prix équivalents",
			pricesHint:
				"Affiche chaque prix en chaos et divine (PoE1) ou en exalté et divine (PoE2), avec les taux de poe.ninja actualisés toutes les 30 minutes. L'activer demande l'autorisation de lire poe.ninja.",
			pricesMissingAccess:
				"Les prix équivalents sont activés dans un autre navigateur, mais celui-ci n'a pas reçu l'autorisation de lire poe.ninja. Activez l'interrupteur pour l'autoriser.",
			listingTime: "Heure exacte de mise en vente",
			listingTimeHint:
				"Affiche la date et l'heure de mise en vente de chaque objet, à côté du « il y a 2 heures » du site.",
			affixCount: "Nombre de préfixes et de suffixes",
			affixCountHint:
				"Affiche combien de préfixes et de suffixes a chaque objet, d'après les paliers de modificateurs envoyés par le site.",
			itemTools: "Copie d'objet et lien wiki",
			itemToolsHint:
				"Ajoute un bouton qui copie l'objet sous forme de texte du jeu, et un lien vers la page wiki de l'objet.",
			socketWarning: "Avertissement de châsses (PoE1)",
			socketWarningHint:
				"Signale les objets dont le niveau d'objet les maintient sous le nombre de châsses de la base, comme une base à 6 châsses qui ne pourra jamais en avoir 6.",
			pricesDenied:
				"Les prix équivalents ont besoin d'un accès à poe.ninja. Rien n'a été modifié.",
		},
		trade: {
			title: "Site de commerce",
			tabTitles: "Titres des onglets",
			tabTitlesHint:
				"Met le nom du favori, ou l'objet et la ligue, dans l'onglet du navigateur, avec ⚡ pour les recherches en direct.",
			fuzzy: "Recherche d'objet approximative",
			fuzzyHint:
				"Ajoute ~ quand vous commencez à taper dans la zone de recherche d'objet. Commencez par une espace pour une recherche exacte.",
			fuzzyFilters: "Recherche approximative des filtres de stat",
			fuzzyFiltersHint:
				"La même chose pour les zones où vous choisissez un filtre de stat.",
			backForward: "Précédent et Suivant entre les recherches",
			backForwardHint:
				"Le bouton Précédent du navigateur revient à votre recherche précédente au lieu de quitter le site.",
		},
		watchers: {
			title: "Suivis",
			description:
				"Les annonces et recherches suivies sont vérifiées en arrière-plan, au plus aussi souvent que les limites de débit de GGG le permettent.",
			access: "Accès au site de commerce",
			accessHint:
				"Nécessaire pour les vérifications en arrière-plan. Votre navigateur demande une fois ; les requêtes vont uniquement au site de commerce officiel.",
			allowed: "Autorisé",
			allow: "Autoriser",
			denied:
				"Non autorisé. Les suivis restent en pause jusqu'à votre autorisation.",
			interval: "Vérifier toutes les",
			intervalHint: (min: number) =>
				`Minutes entre les vérifications pour les nouveaux suivis, ${min} au minimum. Chaque vérification échouée attend deux fois plus longtemps que la précédente.`,
			intervalInput: "Minutes entre les vérifications",
			notify: "Notifications",
			notifyHint:
				"Une notification du navigateur quand une annonce suivie est vendue, revient ou change de prix, ou qu'une recherche suivie a de nouveaux résultats. L'activer demande l'autorisation une fois.",
			notifyMissingAccess:
				"Les notifications sont activées dans un autre navigateur, mais celui-ci ne les a pas autorisées. Activez-les pour les autoriser ici.",
			notifyDenied:
				"Les notifications ont besoin de l'autorisation de votre navigateur. Rien n'a été modifié.",
		},
		hotkeys: {
			title: "Raccourcis clavier",
			description:
				"Sur le site de commerce. Les raccourcis de la zone de recherche fonctionnent aussi pendant que vous tapez dans l'une d'elles.",
			actions: {
				togglePanel: "Afficher ou masquer le panneau",
				focusItemSearch: "Aller à la recherche d'objet",
				addStatFilter: "Ajouter un filtre de stat",
				clearSearch: "Effacer la recherche",
				focusMin: "Aller au min du filtre de stat",
				focusMax: "Aller au max du filtre de stat",
			} satisfies Record<HotkeyAction, string>,
			unbound: "Non défini",
			recording: "Appuyez sur les touches",
			recordingHint:
				"Appuyez sur le nouveau raccourci, ou sur Escape pour annuler.",
			change: (action: string) => `Changer le raccourci de ${action}`,
			remove: (action: string) => `Supprimer le raccourci de ${action}`,
			reset: "Rétablir les valeurs par défaut",
			reserved: (combo: string) =>
				`${combo} est un raccourci du navigateur. Choisissez-en un autre.`,
			taken: (combo: string, action: string) =>
				`${combo} est déjà utilisé pour « ${action} ».`,
		},
		history: {
			title: "Historique",
			record: "Enregistrer les recherches",
			recordHint: "Conservé sur cet appareil uniquement, jusqu'à 200 par jeu.",
			clearAll: "Effacer tout l'historique",
			clearAllHint: "Les deux jeux, sur cet appareil.",
			clear: "Effacer l'historique",
			cleared: "Historique effacé.",
		},
		about: {
			title: "À propos et confidentialité",
			body: "Exile Ledger garde vos favoris dans votre navigateur et les synchronise via votre compte de navigateur. Il n'envoie rien ailleurs : pas d'analyse, pas de suivi, et il ne lit jamais votre session Path of Exile. Il ne voit que les recherches de commerce que votre propre page effectue.",
		},
	},
	popup: {
		version: (version: string) => `Version ${version}`,
		body: "Le panneau se trouve sur le site de commerce. Les paramètres, sauvegardes et imports sont dans la page des paramètres.",
		openSettings: "Ouvrir les paramètres",
	},
};
