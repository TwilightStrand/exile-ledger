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

const locale = "zh";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) => plural(locale, n, { other: `${n} 个书签` });

const folders = (n: number) => plural(locale, n, { other: `${n} 个文件夹` });

const results = (n: number) =>
	plural(locale, n, { other: `${number(n)} 条结果` });

const fixCorrupted = "请将“已腐化”设为“任意”或“是”。";

export const zh: Messages = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "任意物品",
		cancel: "取消",
		delete: "删除",
		keep: "保留",
		liveSearch: "实时搜索",
		savedToBookmarks: "已保存到书签",
		results,
	},
	time: {
		justNow: "刚刚",
		minutesAgo: (n: number) => `${n}分钟前`,
		hoursAgo: (n: number) => `${n}小时前`,
		yesterday: "昨天",
		daysAgo: (n: number) => `${n}天前`,
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "调整面板大小",
		resizeValue: (percent: number) => `占窗口的 ${percent}%`,
		resizeValuePx: (px: number) => `${px} px`,
		collapse: "收起 Exile Ledger",
		expand: "展开 Exile Ledger",
		expandTab: "账本",
		sections: "面板分区",
		saveFailed: "无法保存此更改。请重试。",
		reloadNeeded: "Exile Ledger 已更新。请刷新此页面以继续保存更改。",
		dismiss: "关闭",
		tabs: {
			bookmarks: "书签",
			history: "历史",
			pinned: "置顶",
			watchers: "监视",
		},
	},
	currentSearch: {
		heading: "当前搜索",
		problems: "搜索问题",
		save: "保存搜索",
		empty: "在交易网站上进行搜索后，结果会显示在这里。",
	},
	bookmarks: {
		defaultFolder: "已保存的搜索",
		nav: "书签",
		emptyTitle: "还没有书签",
		emptyBody: "保存搜索后会放在这里。文件夹会同步到你的其他浏览器。",
		newFolder: "新建文件夹",
		newFolderName: "新文件夹名称",
		folderNamePlaceholder: "文件夹名称",
		folderName: "文件夹名称",
		bookmarkName: "书签名称",
		archived: "已归档",
		folderIcon: "文件夹图标",
		folderIcons: {
			folder: "文件夹",
			sword: "剑",
			bow: "弓",
			shield: "盾",
			helmet: "头盔",
			ring: "戒指",
			amulet: "护身符",
			gem: "宝石",
			flask: "药剂",
			map: "地图",
			coin: "通货",
			star: "星星",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `重命名 ${name}`,
		delete: (name: string) => `删除 ${name}`,
		archive: (name: string) => `归档 ${name}`,
		restore: (name: string) => `恢复 ${name}`,
		newFolderIn: (name: string) => `在 ${name} 中新建文件夹`,
		changeIcon: (name: string) => `更改 ${name} 的图标`,
		copyShareFor: (name: string) => `复制 ${name} 的分享字符串`,
		copyShare: "复制分享字符串",
		shareCopied: "分享字符串已复制",
		copied: "已复制",
		overwrite: (name: string) => `用当前搜索替换 ${name}`,
		confirmOverwrite: (name: string) => `用当前搜索替换“${name}”？`,
		replace: "替换",
		watch: (name: string) => `监视 ${name} 的新结果`,
		unwatch: (name: string) => `停止监视 ${name} 的新结果`,
		markDone: (name: string) => `将 ${name} 标记为完成`,
		markNotDone: (name: string) => `将 ${name} 标记为未完成`,
		done: "完成",
		more: (name: string) => `${name} 的更多操作`,
		allDone: "全部标记为完成",
		allNotDone: "全部标记为未完成",
		changeLeague: "更改联盟",
		league: "联盟",
		leaguePlaceholder: "联盟名称，例如 Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `这里的所有内容已经在 ${league} 中。`
				: `已将 ${bookmarks(n)}移至 ${league}。`,
		confirmDeleteBookmark: (name: string) => `删除“${name}”？`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							other: `${subfolders} 个子文件夹`,
						})
					: null,
			].filter(Boolean);
			return `删除“${name}”${inside.length ? `及其中的${inside.join("和")}` : ""}？`;
		},
	},
	history: {
		emptyTitle: "还没有历史记录",
		emptyBody: "你在交易网站上进行的搜索会列在这里。",
		clear: "清除历史",
		saveAs: (title: string) => `将 ${title} 保存为书签`,
	},
	watchers: {
		emptyTitle: "没有监视项",
		emptyBody:
			"对结果使用“监视”，或点击书签上的眼睛图标，Exile Ledger 会在后台检查。",
		needsAccess: "后台检查需要访问交易网站的权限。请在设置页面中允许。",
		allow: "打开设置",
		listings: "商品",
		searches: "搜索",
		status: {
			listed: "在售",
			gone: "已售出或已下架",
			back: "重新上架",
		} satisfies Record<ListingWatcher["status"], string>,
		repriced: (from: string, to: string) => `${from} → ${to}`,
		noPrice: "无价格",
		notChecked: "尚未检查",
		checked: (ago: string) => `${ago}检查`,
		retrying: "交易网站繁忙，稍后重试",
		newResults: (n: number) => `${number(n)} 条新结果`,
		total: (n: number) => results(n),
		remove: (name: string) => `停止监视 ${name}`,
		every: (minutes: number) => `每 ${minutes} 分钟`,
	},
	notices: {
		goneTitle: (name: string) => `${name} 已不在`,
		goneBody: (seller: string) =>
			seller ? `已由 ${seller} 售出或下架。` : "已售出或下架。",
		backTitle: (name: string) => `${name} 重新上架`,
		repricedTitle: (name: string) => `${name} 价格变动`,
		newTitle: (name: string) => `${name} 有新结果`,
		moreTitle: (n: number) => `另有 ${number(n)} 条监视更新`,
		moreBody: "在 Exile Ledger 面板的“监视”标签中查看全部。",
	},
	pins: {
		emptyTitle: "没有置顶项",
		emptyBody: "对结果使用“置顶”，即可在继续搜索时保留在这里。",
		gone: "已不在此页面",
		noPrice: "无价格",
		unpin: (name: string) => `取消置顶 ${name}`,
	},
	trade: {
		watch: "监视",
		watching: "监视中",
		watchTitle: "在后台检查此商品，价格变动或售出时通知你",
		pin: "置顶",
		unpin: "取消置顶",
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		stackValue: (stackSize: number, parts: string[]) =>
			`${stackSize} 张一叠，按 poe.ninja 卡牌价格约值 ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		listedAt: (at: number) =>
			`上架于 ${new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`,
		affixes: (prefixes: number, suffixes: number) =>
			`${prefixes}前 · ${suffixes}后`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { other: `${prefixes} 个前缀` })}，${plural(locale, suffixes, { other: `${suffixes} 个后缀` })}`,
		copyItem: "复制物品",
		copyItemTitle:
			"以游戏内文本格式复制物品，可用于 Path of Building 或交易网站的粘贴搜索",
		copied: "已复制",
		copyFailed: "复制失败",
		wiki: "Wiki",
		wikiTitle: (page: string) => `在 Wiki 中打开 ${page}`,
		socketShortfall: (itemLevel: number, max: number) =>
			`物品等级 ${itemLevel}：最多 ${max} 个插槽`,
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "赋予技能石",
			enlighten: "启蒙技能石",
			enhance: "增幅技能石",
			awakened: "觉醒技能石",
			any: "技能石",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "头盔、手套和鞋子",
			shields: "盾牌",
			"one-handed": "单手武器",
			any: "物品",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems}最高只能到 ${maxLevel} 级，且必须已腐化。没有物品能满足最低 ${wanted} 的要求。`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems}只有通过腐化才能超过 ${maxLevel} 级，但此搜索排除了已腐化的物品。${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems}品质最高只能到 ${maxQuality}%，且必须已腐化。没有物品能满足最低 ${wanted}% 的要求。`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems}只有通过腐化才能超过 ${maxQuality}% 品质，但此搜索排除了已腐化的物品。${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items}最多有 ${max} 个插槽，因此没有物品能满足最少 ${wanted} 个插槽的要求。`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items}最多有 ${max} 个插槽，因此没有物品能满足最少 ${wanted} 连的要求。`,
		mirroredAndCorrupted:
			"已腐化的物品无法被镜像，已镜像的物品也无法被腐化。请将“已镜像”或“已腐化”之一设为“任意”。",
		fracturedUnique:
			"传奇物品不会有断裂词缀。请将“断裂”设为“任意”，或选择其他稀有度。",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter}的最小值 ${min} 大于最大值 ${max}。`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`某个属性组的数量或总计的最小值 ${min} 大于最大值 ${max}。`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`某个属性筛选的最小值 ${min} 大于最大值 ${max}。`,
	},
	sync: {
		off: "同步已关闭。书签仅保存在这台设备上。",
		on: (ago: string | null, percent: number) =>
			`已同步${ago ? ` ${ago}` : ""} · 已用 ${percent}% 的同步空间`,
		waiting: "另一个浏览器正在写入，稍后重试。",
		quota:
			"书签过多，超出浏览器同步的容量。你的书签仍安全保存在这台设备上；归档或删除一些书签后即可恢复同步。",
		newer:
			"另一个浏览器使用较新版本的 Exile Ledger 进行了同步。请在此更新扩展以恢复同步；此设备上的书签是安全的。",
		failed: "同步失败。",
	},
	imports: {
		title: "备份与分享",
		description:
			"导入只会在你现有内容旁添加新文件夹，不会更改或删除任何已有内容。",
		backupLabel: "备份全部内容",
		backupHint:
			"包含所有文件夹、书签和设置的文件。历史记录仅保留在这台设备上。",
		saveBackup: "保存备份文件",
		restoreLabel: "从备份文件恢复",
		restoreHint: "选择由 Exile Ledger 保存的文件。",
		chooseFile: "选择文件",
		shareLabel: "导入分享的文件夹",
		shareHint:
			"粘贴通过面板中文件夹的“复制分享字符串”复制的内容，或来自 Better Trading、Poe Trade Plus 或 TFT 的导出内容。",
		shareInput: "分享字符串",
		sharePlaceholder: "EL1:…",
		read: "读取",
		restoreSettings: "同时恢复设置",
		import: "导入",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)}和${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `备份已保存，包含${summary}。`,
		imported: (summary: string) => `已导入${summary}。`,
		watchersFailed: (summary: string) =>
			`已导入${summary}，但备份中的监视项未能保存。`,
		backupFrom: (exportedAt: number, summary: string) =>
			`备份时间 ${new Date(exportedAt).toLocaleString(locale)}：${summary}。`,
		fromSource: (source: string, summary: string) => `${source}：${summary}。`,
		saveFailed: "无法保存导入内容。请刷新此页面后重试。",
		skipped: (n: number) =>
			plural(locale, n, { other: `已跳过 ${n} 条损坏或过大的记录。` }),
		sources: {
			"exile-ledger": "分享的文件夹",
			"better-trading": "Better Trading 导出",
			"poe-trade-plus": "Poe Trade Plus 导出",
			tft: "TFT Trade Extension 导出",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "这不是 Exile Ledger 分享字符串。",
			"share-damaged": "分享字符串已损坏或不完整。",
			"share-empty": "分享字符串中没有文件夹。",
			"not-backup": "此文件不是 Exile Ledger 备份，或已损坏。",
			"unknown-format":
				"这不是 Exile Ledger、Better Trading 或 Poe Trade Plus 的导出内容。",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Exile Ledger 设置",
		versionLine: (version: string) => `设置 · 版本 ${version}`,
		panel: {
			title: "面板",
			description: "面板在交易网站上的显示方式。",
			side: "停靠侧",
			sides: { left: "左侧", right: "右侧" },
			layout: "布局",
			layoutHint: "浮在页面上方，或将页面推向一侧，使面板不会遮挡结果。",
			modes: { overlay: "浮动覆盖", push: "推开页面" },
			width: "宽度",
			widthHintPercent: (minPx: number, maxPx: number) =>
				`占浏览器窗口宽度的百分比，面板会随窗口一起变宽或变窄，但不会窄于 ${minPx} px，也不会宽于 ${maxPx} px。你也可以拖动面板的内侧边缘。`,
			widthHintPx: (minPx: number, maxPx: number) =>
				`固定的像素宽度，从 ${minPx} 到 ${maxPx} px，不随窗口大小变化。你也可以拖动面板的内侧边缘。`,
			widthUnit: "宽度单位",
			widthUnits: { percent: "%", px: "px" } satisfies Record<
				PanelWidthUnit,
				string
			>,
			widthInput: "面板宽度",
		},
		appearance: {
			title: "外观",
			description:
				"面板、此页面以及 Exile Ledger 在交易结果上添加的标记的颜色。",
			theme: "主题",
			themes: {
				gold: "暗金",
				blood: "血红",
				verdant: "翠绿",
				azure: "天蓝",
				bone: "骨白",
			} satisfies Record<ThemeId, string>,
			language: "语言",
			languageHint:
				"英语以外的语言由机器翻译。欢迎母语者在 GitHub 上提出修改意见。",
			languageAuto: "与浏览器相同",
			compact: "紧凑模式",
			compactHint: "面板中的行更矮，可以容纳更多书签。",
		},
		sync: {
			title: "同步",
			description:
				"书签和文件夹会通过你的浏览器账户跟随你。历史记录只保留在各自的设备上。",
			toggle: "同步书签",
			space: "同步空间",
		},
		results: {
			title: "结果",
			description: "对交易网站自带结果列表的补充。",
			highlight: "高亮已搜索的词缀",
			highlightHint: "标出每条结果中被你的搜索筛选的词缀行。",
			prices: "等值价格",
			pricesHint:
				"以混沌石和神圣石（PoE1）或崇高石和神圣石（PoE2）显示每个价格，使用每 30 分钟刷新一次的 poe.ninja 汇率。开启时会请求读取 poe.ninja 的权限。",
			pricesMissingAccess:
				"等值价格已在另一个浏览器中开启，但此浏览器尚未被允许读取 poe.ninja。打开开关即可允许。",
			listingTime: "确切上架时间",
			listingTimeHint: "在网站自带的“2 小时前”旁显示每件物品的上架日期和时间。",
			affixCount: "前缀和后缀数量",
			affixCountHint: "根据网站发送的词缀阶层，显示每件物品有多少前缀和后缀。",
			itemTools: "复制物品和 Wiki 链接",
			itemToolsHint:
				"添加一个以游戏内文本格式复制物品的按钮，以及指向该物品 Wiki 页面的链接。",
			socketWarning: "插槽警告 (PoE1)",
			socketWarningHint:
				"标注因物品等级而无法达到底子插槽数的物品，例如永远不可能有 6 个插槽的 6 孔底子。",
			pricesDenied: "等值价格需要访问 poe.ninja。未作任何更改。",
		},
		trade: {
			title: "交易网站",
			tabTitles: "标签页标题",
			tabTitlesHint:
				"在浏览器标签页中显示书签名称，或物品和联盟，实时搜索以 ⚡ 标记。",
			fuzzy: "模糊物品搜索",
			fuzzyHint: "在物品搜索框中开始输入时自动添加 ~。以空格开头可精确搜索。",
			fuzzyFilters: "模糊属性筛选搜索",
			fuzzyFiltersHint: "对选择属性筛选的输入框同样适用。",
			backForward: "在搜索之间后退和前进",
			backForwardHint: "浏览器的后退按钮会回到上一次搜索，而不是离开网站。",
		},
		watchers: {
			title: "监视",
			description:
				"被监视的商品和搜索会在后台检查，频率不会超过 GGG 速率限制所允许的上限。",
			access: "交易网站访问权限",
			accessHint:
				"后台检查所需。浏览器只会询问一次；请求只会发送到官方交易网站。",
			allowed: "已允许",
			allow: "允许",
			denied: "未允许。在你允许之前，监视将保持暂停。",
			interval: "检查间隔",
			intervalHint: (min: number) =>
				`新监视项两次检查之间的分钟数，最少 ${min} 分钟。每次检查失败后，等待时间会加倍。`,
			intervalInput: "检查间隔分钟数",
			notify: "通知",
			notifyHint:
				"当被监视的商品售出、重新上架或价格变动，或被监视的搜索有新结果时，发送浏览器通知。开启时会请求一次权限。",
			notifyMissingAccess:
				"通知已在另一个浏览器中开启，但此浏览器尚未允许。打开开关即可在此允许。",
			notifyDenied: "通知需要浏览器的权限。未作任何更改。",
		},
		hotkeys: {
			title: "键盘快捷键",
			description: "适用于交易网站。搜索框快捷键在搜索框内输入时也有效。",
			actions: {
				togglePanel: "显示或隐藏面板",
				focusItemSearch: "转到物品搜索",
				addStatFilter: "添加属性筛选",
				clearSearch: "清除搜索",
				focusMin: "转到属性筛选的最小值",
				focusMax: "转到属性筛选的最大值",
			} satisfies Record<HotkeyAction, string>,
			unbound: "未设置",
			recording: "请按键",
			recordingHint: "按下新的快捷键，或按 Escape 取消。",
			change: (action: string) => `更改“${action}”的快捷键`,
			remove: (action: string) => `移除“${action}”的快捷键`,
			reset: "恢复默认",
			reserved: (combo: string) => `${combo} 是浏览器快捷键。请选择其他组合。`,
			taken: (combo: string, action: string) => `${combo} 已用于“${action}”。`,
		},
		history: {
			title: "历史",
			record: "记录搜索",
			recordHint: "仅保存在这台设备上，每个游戏最多 200 条。",
			clearAll: "清除所有历史",
			clearAllHint: "两个游戏，仅限这台设备。",
			clear: "清除历史",
			cleared: "历史已清除。",
		},
		about: {
			title: "关于与隐私",
			body: "Exile Ledger 将你的书签保存在浏览器中，并通过你的浏览器账户同步。它不会向其他任何地方发送数据：没有分析，没有跟踪，也绝不会读取你的 Path of Exile 会话。它只能看到你自己的页面发出的交易搜索。",
		},
	},
	popup: {
		version: (version: string) => `版本 ${version}`,
		body: "面板位于交易网站上。设置、备份和导入在设置页面中。",
		openSettings: "打开设置",
	},
};
