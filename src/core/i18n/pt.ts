import type { ImportError } from "../exchange";
import type { HotkeyAction } from "../hotkeys";
import type { ImportSource } from "../importers";
import type { FolderIcon } from "../model";
import type { GemKind, SocketItemKind } from "../searchChecks";
import type { PanelWidthUnit } from "../settings";
import type { ThemeId } from "../themes";
import type { Game } from "../tradeUrl";
import type { ListingWatcher } from "../watchers";
import { listingDateTime } from "./dateTime";
import type { Messages } from "./en";
import { plural } from "./plural";

const locale = "pt";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) =>
	plural(locale, n, {
		one: `${n} favorito`,
		many: `${n} favoritos`,
		other: `${n} favoritos`,
	});

const folders = (n: number) =>
	plural(locale, n, {
		one: `${n} pasta`,
		many: `${n} pastas`,
		other: `${n} pastas`,
	});

const results = (n: number) =>
	plural(locale, n, {
		one: `${number(n)} resultado`,
		many: `${number(n)} resultados`,
		other: `${number(n)} resultados`,
	});

const fixCorrupted = "Defina Corrompido como Qualquer ou Sim.";

export const pt: Messages = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "Qualquer item",
		cancel: "Cancelar",
		delete: "Excluir",
		keep: "Manter",
		liveSearch: "Busca ao vivo",
		savedToBookmarks: "Salvo nos favoritos",
		results,
	},
	time: {
		justNow: "agora mesmo",
		minutesAgo: (n: number) => `há ${n} min`,
		hoursAgo: (n: number) => `há ${n} h`,
		yesterday: "ontem",
		daysAgo: (n: number) => `há ${n} d`,
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "Redimensionar painel",
		resizeValue: (percent: number) => `${percent}% da janela`,
		resizeValuePx: (px: number) => `${px} px`,
		collapse: "Recolher o Exile Ledger",
		expand: "Expandir o Exile Ledger",
		expandTab: "Ledger",
		sections: "Seções do painel",
		saveFailed: "Não foi possível salvar a alteração. Tente de novo.",
		reloadNeeded:
			"O Exile Ledger foi atualizado. Recarregue esta página para continuar salvando alterações.",
		queryTooLarge:
			"Esta busca é grande demais para salvar. Remova alguns filtros de atributos e tente de novo.",
		dismiss: "Fechar",
		tabs: {
			bookmarks: "Favoritos",
			history: "Histórico",
			pinned: "Fixados",
			watchers: "Monitorar",
		},
	},
	currentSearch: {
		heading: "Busca atual",
		problems: "Problemas da busca",
		save: "Salvar busca",
		empty: "Faça uma busca no site de comércio e ela aparecerá aqui.",
	},
	bookmarks: {
		defaultFolder: "Buscas salvas",
		nav: "Favoritos",
		emptyTitle: "Nenhum favorito ainda",
		emptyBody:
			"Salve uma busca para mantê-la aqui. As pastas são sincronizadas com seus outros navegadores.",
		newFolder: "Nova pasta",
		newFolderName: "Nome da nova pasta",
		folderNamePlaceholder: "Nome da pasta",
		folderName: "Nome da pasta",
		bookmarkName: "Nome do favorito",
		archived: "Arquivados",
		folderIcon: "Ícone da pasta",
		folderIcons: {
			folder: "Pasta",
			sword: "Espada",
			bow: "Arco",
			shield: "Escudo",
			helmet: "Elmo",
			ring: "Anel",
			amulet: "Amuleto",
			gem: "Gema",
			flask: "Frasco",
			map: "Mapa",
			coin: "Moeda",
			star: "Estrela",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `Renomear ${name}`,
		delete: (name: string) => `Excluir ${name}`,
		archive: (name: string) => `Arquivar ${name}`,
		restore: (name: string) => `Restaurar ${name}`,
		newFolderIn: (name: string) => `Nova pasta em ${name}`,
		changeIcon: (name: string) => `Alterar o ícone de ${name}`,
		copyShareFor: (name: string) =>
			`Copiar o código de compartilhamento de ${name}`,
		copyShare: "Copiar código de compartilhamento",
		shareCopied: "Código de compartilhamento copiado",
		copied: "Copiado",
		overwrite: (name: string) => `Substituir ${name} pela busca atual`,
		confirmOverwrite: (name: string) =>
			`Substituir “${name}” pela busca atual?`,
		replace: "Substituir",
		watch: (name: string) => `Monitorar ${name} para novos resultados`,
		unwatch: (name: string) =>
			`Parar de monitorar ${name} para novos resultados`,
		markDone: (name: string) => `Marcar ${name} como concluído`,
		markNotDone: (name: string) => `Marcar ${name} como pendente`,
		done: "Concluído",
		more: (name: string) => `Mais opções para ${name}`,
		allDone: "Marcar tudo como concluído",
		allNotDone: "Marcar tudo como pendente",
		changeLeague: "Trocar de liga",
		league: "Liga",
		leaguePlaceholder: "Nome da liga, p. ex. Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `Tudo aqui já estava em ${league}.`
				: `${bookmarks(n)} movidos para ${league}.`,
		confirmDeleteBookmark: (name: string) => `Excluir “${name}”?`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							one: `${subfolders} subpasta`,
							many: `${subfolders} subpastas`,
							other: `${subfolders} subpastas`,
						})
					: null,
			].filter(Boolean);
			return `Excluir “${name}”${inside.length ? ` e seus ${inside.join(" e ")}` : ""}?`;
		},
	},
	history: {
		emptyTitle: "Nenhum histórico ainda",
		emptyBody: "As buscas que você faz no site de comércio aparecem aqui.",
		clear: "Limpar histórico",
		saveAs: (title: string) => `Salvar ${title} como favorito`,
	},
	watchers: {
		emptyTitle: "Nada monitorado",
		emptyBody:
			"Use Monitorar em um resultado, ou o olho em um favorito, e o Exile Ledger verifica em segundo plano.",
		needsAccess:
			"As verificações em segundo plano precisam de permissão para acessar o site de comércio. Permita na página de configurações.",
		allow: "Abrir configurações",
		listings: "Anúncios",
		searches: "Buscas",
		status: {
			listed: "À venda",
			gone: "Vendido ou removido",
			back: "À venda de novo",
		} satisfies Record<ListingWatcher["status"], string>,
		repriced: (from: string, to: string) => `${from} → ${to}`,
		noPrice: "Sem preço",
		notChecked: "Ainda não verificado",
		checked: (ago: string) => `verificado ${ago}`,
		retrying: "Site de comércio ocupado, tentando de novo mais tarde",
		newResults: (n: number) =>
			plural(locale, n, {
				one: `${number(n)} novo`,
				many: `${number(n)} novos`,
				other: `${number(n)} novos`,
			}),
		total: (n: number) => results(n),
		remove: (name: string) => `Parar de monitorar ${name}`,
		every: (minutes: number) => `a cada ${minutes} min`,
	},
	notices: {
		goneTitle: (name: string) => `${name} sumiu`,
		goneBody: (seller: string) =>
			seller ? `Vendido ou removido por ${seller}.` : "Vendido ou removido.",
		backTitle: (name: string) => `${name} está à venda de novo`,
		repricedTitle: (name: string) => `${name} mudou de preço`,
		newTitle: (name: string) => `Novos resultados para ${name}`,
		moreTitle: (n: number) =>
			plural(locale, n, {
				one: `Mais ${number(n)} atualização de monitoramento`,
				other: `Mais ${number(n)} atualizações de monitoramento`,
			}),
		moreBody: "Abra a aba Monitorar no painel do Exile Ledger para ver todas.",
	},
	pins: {
		emptyTitle: "Nada fixado",
		emptyBody:
			"Use Fixar em um resultado para mantê-lo aqui enquanto você continua buscando.",
		gone: "Não está mais nesta página",
		noPrice: "Sem preço",
		unpin: (name: string) => `Desafixar ${name}`,
	},
	trade: {
		watch: "Monitorar",
		watching: "Monitorando",
		watchTitle:
			"Verifica este anúncio em segundo plano e avisa quando o preço mudar ou ele for vendido",
		pin: "Fixar",
		unpin: "Desafixar",
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		stackValue: (stackSize: number, parts: string[]) =>
			`Pilha de ${stackSize} vale ≈ ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		listedAt: (at: number) => `À venda desde ${listingDateTime(undefined, at)}`,
		affixes: (prefixes: number, suffixes: number) =>
			`${prefixes}P · ${suffixes}S`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { one: `${prefixes} prefixo`, many: `${prefixes} prefixos`, other: `${prefixes} prefixos` })}, ${plural(locale, suffixes, { one: `${suffixes} sufixo`, many: `${suffixes} sufixos`, other: `${suffixes} sufixos` })}`,
		copyItem: "Copiar item",
		copyItemTitle:
			"Copia o item como texto do jogo, para o Path of Building ou a busca por colagem do site de comércio",
		copied: "Copiado",
		copyFailed: "Falha ao copiar",
		wiki: "Wiki",
		wikiTitle: (page: string) => `Abrir ${page} na wiki`,
		socketShortfall: (itemLevel: number, max: number) =>
			`Nível do item ${itemLevel}: no máximo ${max} encaixes`,
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "Gemas Empower",
			enlighten: "Gemas Enlighten",
			enhance: "Gemas Enhance",
			awakened: "Gemas despertas",
			any: "Gemas",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "Elmos, luvas e botas",
			shields: "Escudos",
			"one-handed": "Armas de uma mão",
			any: "Itens",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems} chegam no máximo ao nível ${maxLevel}, e só quando corrompidas. Nada pode atender a um mínimo de ${wanted}.`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems} só passam do nível ${maxLevel} ao serem corrompidas, mas esta busca exclui itens corrompidos. ${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems} chegam no máximo a ${maxQuality}% de qualidade, e só quando corrompidas. Nada pode atender a um mínimo de ${wanted}%.`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems} só passam de ${maxQuality}% de qualidade ao serem corrompidas, mas esta busca exclui itens corrompidos. ${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} têm no máximo ${max} encaixes, então nada pode atender a um mínimo de ${wanted} encaixes.`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} têm no máximo ${max} encaixes, então nada pode atender a um mínimo de ${wanted} ligações.`,
		mirroredAndCorrupted:
			"Itens corrompidos não podem ser espelhados, e itens espelhados não podem ser corrompidos. Defina Espelhado ou Corrompido como Qualquer.",
		fracturedUnique:
			"Itens únicos nunca são fraturados. Defina Fraturado como Qualquer ou escolha outra raridade.",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter} tem um mínimo de ${min} acima do máximo de ${max}.`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`A contagem ou o total de um grupo de atributos tem um mínimo de ${min} acima do máximo de ${max}.`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`Um filtro de atributos tem um mínimo de ${min} acima do máximo de ${max}.`,
	},
	sync: {
		off: "A sincronização está desativada. Os favoritos ficam neste computador.",
		on: (ago: string | null, percent: number) =>
			`Sincronizado${ago ? ` ${ago}` : ""} · ${percent}% do espaço de sincronização usado`,
		waiting: "Outro navegador está gravando; tentando de novo em instantes.",
		quota:
			"Favoritos demais para a sincronização do navegador. Seus favoritos estão seguros neste computador; arquive ou exclua alguns para retomar a sincronização.",
		newer:
			"Outro navegador sincronizou com uma versão mais nova do Exile Ledger. Atualize a extensão aqui para retomar a sincronização; seus favoritos neste computador estão seguros.",
		failed: "Falha na sincronização.",
	},
	imports: {
		title: "Backup e compartilhamento",
		description:
			"As importações sempre adicionam pastas novas ao lado das suas. Nada do que você já tem é alterado ou removido.",
		backupLabel: "Fazer backup de tudo",
		backupHint:
			"Um arquivo com todas as pastas, favoritos e configurações. O histórico fica neste computador.",
		saveBackup: "Salvar arquivo de backup",
		restoreLabel: "Restaurar de um arquivo de backup",
		restoreHint: "Escolha um arquivo salvo pelo Exile Ledger.",
		chooseFile: "Escolher arquivo",
		shareLabel: "Importar uma pasta compartilhada",
		shareHint:
			"Cole um código copiado com “Copiar código de compartilhamento” em uma pasta do painel, ou uma exportação do Better Trading, Poe Trade Plus ou TFT.",
		shareInput: "Código de compartilhamento",
		sharePlaceholder: "EL1:…",
		read: "Ler",
		restoreSettings: "Restaurar também as configurações",
		import: "Importar",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)} e ${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `Backup salvo com ${summary}.`,
		imported: (summary: string) => `Importado: ${summary}.`,
		watchersFailed: (summary: string) =>
			`Importado: ${summary}. Mas não foi possível salvar os monitoramentos do backup.`,
		backupFrom: (exportedAt: number, summary: string) =>
			`Backup de ${new Date(exportedAt).toLocaleString(locale)}: ${summary}.`,
		fromSource: (source: string, summary: string) => `${source}: ${summary}.`,
		saveFailed:
			"Não foi possível salvar a importação. Recarregue esta página e tente de novo.",
		skipped: (n: number) =>
			plural(locale, n, {
				one: `${n} registro foi ignorado porque estava danificado ou era grande demais.`,
				other: `${n} registros foram ignorados porque estavam danificados ou eram grandes demais.`,
			}),
		queriesDropped: (n: number) =>
			plural(locale, n, {
				one: `${n} favorito foi mantido sem a busca salva, que era grande demais: ele abre pelo ID da busca salva e não pode ser monitorado.`,
				other: `${n} favoritos foram mantidos sem a busca salva, que era grande demais: eles abrem pelo ID da busca salva e não podem ser monitorados.`,
			}),
		sources: {
			"exile-ledger": "Pasta compartilhada",
			"better-trading": "Exportação do Better Trading",
			"poe-trade-plus": "Exportação do Poe Trade Plus",
			tft: "Exportação do TFT Trade Extension",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "Isto não é um código de compartilhamento do Exile Ledger.",
			"share-damaged":
				"O código de compartilhamento está danificado ou incompleto.",
			"share-empty": "O código de compartilhamento não contém pastas.",
			"not-backup":
				"Este arquivo não é um backup do Exile Ledger, ou está danificado.",
			"unknown-format":
				"Isto não é uma exportação do Exile Ledger, do Better Trading nem do Poe Trade Plus.",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Configurações do Exile Ledger",
		versionLine: (version: string) => `Configurações · versão ${version}`,
		panel: {
			title: "Painel",
			description: "Como o painel se posiciona no site de comércio.",
			side: "Lado de fixação",
			sides: { left: "Esquerda", right: "Direita" },
			layout: "Layout",
			layoutHint:
				"Flutuar sobre a página, ou empurrá-la para o lado para que o painel nunca cubra os resultados.",
			modes: { overlay: "Flutuar sobre", push: "Empurrar para o lado" },
			width: "Largura",
			widthHintPercent: (minPx: number, maxPx: number) =>
				`Porcentagem da janela do navegador, então o painel cresce e diminui com ela. Nunca fica mais estreito que ${minPx} px nem mais largo que ${maxPx} px. Você também pode arrastar a borda interna do painel.`,
			widthHintPx: (minPx: number, maxPx: number) =>
				`Uma largura fixa em pixels, de ${minPx} a ${maxPx} px, qualquer que seja o tamanho da janela. Você também pode arrastar a borda interna do painel.`,
			widthUnit: "Unidade de largura",
			widthUnits: { percent: "%", px: "px" } satisfies Record<
				PanelWidthUnit,
				string
			>,
			widthInput: "Largura do painel",
		},
		appearance: {
			title: "Aparência",
			description:
				"Cores do painel, desta página e das marcas que o Exile Ledger adiciona aos resultados do comércio.",
			theme: "Tema",
			themes: {
				gold: "Ouro escuro",
				blood: "Sangue",
				verdant: "Verdejante",
				azure: "Azul",
				bone: "Osso",
			} satisfies Record<ThemeId, string>,
			language: "Idioma",
			languageHint:
				"Os idiomas diferentes do inglês foram traduzidos automaticamente. Correções de falantes nativos são bem-vindas no GitHub.",
			languageAuto: "Igual ao navegador",
			compact: "Modo compacto",
			compactHint: "Linhas mais baixas no painel, para caberem mais favoritos.",
		},
		sync: {
			title: "Sincronização",
			description:
				"Favoritos e pastas acompanham você pela conta do seu navegador. O histórico fica em cada computador.",
			toggle: "Sincronizar favoritos",
			space: "Espaço de sincronização",
		},
		results: {
			title: "Resultados",
			description:
				"Acréscimos à lista de resultados do próprio site de comércio.",
			highlight: "Destacar modificadores buscados",
			highlightHint:
				"Marca as linhas de modificadores de cada resultado que a sua busca filtrou.",
			prices: "Preços equivalentes",
			pricesHint:
				"Mostra cada preço em chaos e divine (PoE1) ou exalted e divine (PoE2), usando as taxas do poe.ninja atualizadas a cada 30 minutos. Ao ativar, é pedida permissão para ler o poe.ninja.",
			pricesMissingAccess:
				"Os preços equivalentes estão ativados em outro navegador, mas este não tem permissão para ler o poe.ninja. Ative a chave para permitir.",
			listingTime: "Hora exata do anúncio",
			listingTimeHint:
				'Mostra a data e a hora em que cada item foi anunciado, ao lado do "há 2 horas" do site.',
			affixCount: "Contagem de prefixos e sufixos",
			affixCountHint:
				"Mostra quantos prefixos e sufixos cada item tem, a partir dos níveis de modificadores que o site envia.",
			itemTools: "Copiar item e link da wiki",
			itemToolsHint:
				"Adiciona um botão que copia o item como texto do jogo e um link para a página do item na wiki.",
			socketWarning: "Aviso de encaixes (PoE1)",
			socketWarningHint:
				"Avisa sobre itens cujo nível do item os deixa abaixo da quantidade de encaixes da base, como uma base de 6 encaixes que nunca poderá ter 6.",
			pricesDenied:
				"Os preços equivalentes precisam de acesso ao poe.ninja. Nada foi alterado.",
		},
		trade: {
			title: "Site de comércio",
			tabTitles: "Títulos das abas",
			tabTitlesHint:
				"Coloca na aba do navegador o nome do favorito, ou o item e a liga, com ⚡ para buscas ao vivo.",
			fuzzy: "Busca aproximada de itens",
			fuzzyHint:
				"Adiciona ~ quando você começa a digitar na caixa de busca de itens. Comece com um espaço para buscar exatamente.",
			fuzzyFilters: "Busca aproximada de filtros de atributos",
			fuzzyFiltersHint:
				"O mesmo para as caixas onde você escolhe um filtro de atributos.",
			backForward: "Voltar e Avançar entre buscas",
			backForwardHint:
				"O botão Voltar do navegador retorna à sua busca anterior em vez de sair do site.",
		},
		watchers: {
			title: "Monitores",
			description:
				"Anúncios e buscas monitorados são verificados em segundo plano, no máximo na frequência que os limites da GGG permitem.",
			access: "Acesso ao site de comércio",
			accessHint:
				"Necessário para as verificações em segundo plano. Seu navegador pergunta uma vez; as requisições vão apenas para o site de comércio oficial.",
			allowed: "Permitido",
			allow: "Permitir",
			denied: "Não permitido. Os monitores ficam pausados até você permitir.",
			interval: "Verificar a cada",
			intervalHint: (min: number) =>
				`Minutos entre verificações dos novos monitores, ${min} no mínimo. Cada verificação que falha espera o dobro da anterior.`,
			intervalInput: "Minutos entre verificações",
			notify: "Notificações",
			notifyHint:
				"Uma notificação do navegador quando um anúncio monitorado é vendido, volta ou muda de preço, ou quando uma busca monitorada tem novos resultados. Ao ativar, a permissão é pedida uma vez.",
			notifyMissingAccess:
				"As notificações estão ativadas em outro navegador, mas este não as permitiu. Ative-as para permiti-las aqui.",
			notifyDenied:
				"As notificações precisam da permissão do seu navegador. Nada foi alterado.",
		},
		hotkeys: {
			title: "Atalhos de teclado",
			description:
				"No site de comércio. Os atalhos da caixa de busca também funcionam enquanto você digita em uma.",
			actions: {
				togglePanel: "Mostrar ou ocultar o painel",
				focusItemSearch: "Ir para a busca de itens",
				addStatFilter: "Adicionar um filtro de atributos",
				clearSearch: "Limpar a busca",
				focusMin: "Ir para o mínimo do filtro de atributos",
				focusMax: "Ir para o máximo do filtro de atributos",
			} satisfies Record<HotkeyAction, string>,
			unbound: "Não definido",
			recording: "Pressione as teclas",
			recordingHint: "Pressione o novo atalho, ou Escape para cancelar.",
			change: (action: string) => `Alterar o atalho de ${action}`,
			remove: (action: string) => `Remover o atalho de ${action}`,
			reset: "Restaurar padrões",
			reserved: (combo: string) =>
				`${combo} é um atalho do navegador. Escolha outro.`,
			taken: (combo: string, action: string) =>
				`${combo} já é usado para “${action}”.`,
		},
		history: {
			title: "Histórico",
			record: "Registrar buscas",
			recordHint: "Guardado apenas neste computador, até 200 por jogo.",
			clearAll: "Limpar todo o histórico",
			clearAllHint: "Os dois jogos, neste computador.",
			clear: "Limpar histórico",
			cleared: "Histórico limpo.",
		},
		about: {
			title: "Sobre e privacidade",
			body: "O Exile Ledger guarda seus favoritos no seu navegador e os sincroniza pela conta do navegador. Ele não envia nada para outro lugar: sem análises, sem rastreamento, e nunca lê a sua sessão do Path of Exile. Ele só vê as buscas de comércio que a sua própria página faz.",
		},
	},
	popup: {
		version: (version: string) => `Versão ${version}`,
		body: "O painel fica no site de comércio. Configurações, backups e importações estão na página de configurações.",
		openSettings: "Abrir configurações",
	},
};
