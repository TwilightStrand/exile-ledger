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

const locale = "ko";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) => plural(locale, n, { other: `북마크 ${n}개` });

const folders = (n: number) => plural(locale, n, { other: `폴더 ${n}개` });

const results = (n: number) =>
	plural(locale, n, { other: `결과 ${number(n)}개` });

const fixCorrupted = "타락 조건을 ‘전체’ 또는 ‘예’로 설정하세요.";

export const ko: Messages = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "모든 아이템",
		cancel: "취소",
		delete: "삭제",
		keep: "유지",
		liveSearch: "실시간 검색",
		savedToBookmarks: "북마크에 저장했습니다",
		results,
	},
	time: {
		justNow: "방금",
		minutesAgo: (n: number) => `${n}분 전`,
		hoursAgo: (n: number) => `${n}시간 전`,
		yesterday: "어제",
		daysAgo: (n: number) => `${n}일 전`,
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "패널 크기 조절",
		resizeValue: (percent: number) => `창 너비의 ${percent}%`,
		resizeValuePx: (px: number) => `${px}px`,
		collapse: "Exile Ledger 접기",
		expand: "Exile Ledger 펼치기",
		expandTab: "장부",
		sections: "패널 구역",
		saveFailed: "변경 내용을 저장하지 못했습니다. 다시 시도하세요.",
		reloadNeeded:
			"Exile Ledger가 업데이트되었습니다. 변경 내용을 계속 저장하려면 이 페이지를 새로고침하세요.",
		queryTooLarge:
			"이 검색은 너무 커서 저장할 수 없습니다. 능력치 필터를 몇 개 지운 뒤 다시 시도하세요.",
		dismiss: "닫기",
		tabs: {
			bookmarks: "북마크",
			history: "기록",
			pinned: "고정",
			watchers: "감시",
		},
	},
	currentSearch: {
		heading: "현재 검색",
		problems: "검색 문제",
		save: "검색 저장",
		empty: "거래 사이트에서 검색하면 여기에 표시됩니다.",
	},
	bookmarks: {
		defaultFolder: "저장한 검색",
		nav: "북마크",
		emptyTitle: "아직 북마크가 없습니다",
		emptyBody:
			"검색을 저장하면 여기에 보관됩니다. 폴더는 다른 브라우저와 동기화됩니다.",
		newFolder: "새 폴더",
		newFolderName: "새 폴더 이름",
		folderNamePlaceholder: "폴더 이름",
		folderName: "폴더 이름",
		bookmarkName: "북마크 이름",
		archived: "보관됨",
		folderIcon: "폴더 아이콘",
		folderIcons: {
			folder: "폴더",
			sword: "검",
			bow: "활",
			shield: "방패",
			helmet: "투구",
			ring: "반지",
			amulet: "목걸이",
			gem: "젬",
			flask: "플라스크",
			map: "지도",
			coin: "화폐",
			star: "별",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `${name} 이름 변경`,
		delete: (name: string) => `${name} 삭제`,
		archive: (name: string) => `${name} 보관`,
		restore: (name: string) => `${name} 복원`,
		newFolderIn: (name: string) => `${name} 안에 새 폴더`,
		changeIcon: (name: string) => `${name} 아이콘 변경`,
		copyShareFor: (name: string) => `${name} 공유 문자열 복사`,
		copyShare: "공유 문자열 복사",
		shareCopied: "공유 문자열을 복사했습니다",
		copied: "복사됨",
		overwrite: (name: string) => `${name}을(를) 현재 검색으로 교체`,
		confirmOverwrite: (name: string) =>
			`‘${name}’을(를) 현재 검색으로 교체할까요?`,
		replace: "교체",
		watch: (name: string) => `${name}의 새 결과 감시`,
		unwatch: (name: string) => `${name}의 새 결과 감시 중지`,
		markDone: (name: string) => `${name} 완료로 표시`,
		markNotDone: (name: string) => `${name} 미완료로 표시`,
		done: "완료",
		more: (name: string) => `${name} 더 보기`,
		allDone: "모두 완료로 표시",
		allNotDone: "모두 미완료로 표시",
		changeLeague: "리그 변경",
		league: "리그",
		leaguePlaceholder: "리그 이름, 예: Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `이곳의 모든 항목이 이미 ${league}에 있습니다.`
				: `${bookmarks(n)}를 ${league}(으)로 옮겼습니다.`,
		confirmDeleteBookmark: (name: string) => `‘${name}’을(를) 삭제할까요?`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							other: `하위 폴더 ${subfolders}개`,
						})
					: null,
			].filter(Boolean);
			return `‘${name}’${inside.length ? ` 및 그 안의 ${inside.join(", ")}` : ""}을(를) 삭제할까요?`;
		},
	},
	history: {
		emptyTitle: "아직 기록이 없습니다",
		emptyBody: "거래 사이트에서 실행한 검색이 여기에 표시됩니다.",
		clear: "기록 지우기",
		saveAs: (title: string) => `${title}을(를) 북마크로 저장`,
	},
	watchers: {
		emptyTitle: "감시 중인 항목 없음",
		emptyBody:
			"결과에서 감시를 사용하거나 북마크의 눈 아이콘을 누르면 Exile Ledger가 백그라운드에서 확인합니다.",
		needsAccess:
			"백그라운드 확인에는 거래 사이트에 접근할 권한이 필요합니다. 설정 페이지에서 허용하세요.",
		allow: "설정 열기",
		listings: "매물",
		searches: "검색",
		status: {
			listed: "판매 중",
			gone: "판매됨 또는 내려감",
			back: "다시 등록됨",
		} satisfies Record<ListingWatcher["status"], string>,
		repriced: (from: string, to: string) => `${from} → ${to}`,
		noPrice: "가격 없음",
		notChecked: "아직 확인 안 함",
		checked: (ago: string) => `${ago} 확인`,
		retrying: "거래 사이트가 혼잡합니다. 나중에 다시 시도합니다",
		newResults: (n: number) => `새 결과 ${number(n)}개`,
		total: (n: number) => results(n),
		remove: (name: string) => `${name} 감시 중지`,
		every: (minutes: number) => `${minutes}분마다`,
	},
	notices: {
		goneTitle: (name: string) => `${name}이(가) 사라졌습니다`,
		goneBody: (seller: string) =>
			seller
				? `${seller}님이 판매했거나 내렸습니다.`
				: "판매됐거나 내려갔습니다.",
		backTitle: (name: string) => `${name}이(가) 다시 등록되었습니다`,
		repricedTitle: (name: string) => `${name}의 가격이 변경되었습니다`,
		newTitle: (name: string) => `${name}의 새 결과`,
		moreTitle: (n: number) => `감시 알림 ${number(n)}개 더 있음`,
		moreBody: "Exile Ledger 패널의 감시 탭에서 모두 볼 수 있습니다.",
	},
	pins: {
		emptyTitle: "고정한 항목 없음",
		emptyBody:
			"결과에서 고정을 사용하면 계속 검색하는 동안 여기에 남아 있습니다.",
		gone: "이 페이지에 더 이상 없음",
		noPrice: "가격 없음",
		unpin: (name: string) => `${name} 고정 해제`,
	},
	trade: {
		watch: "감시",
		watching: "감시 중",
		watchTitle:
			"이 매물을 백그라운드에서 확인하고 가격이 바뀌거나 판매되면 알려줍니다",
		pin: "고정",
		unpin: "고정 해제",
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		stackValue: (stackSize: number, parts: string[]) =>
			`${stackSize}장 묶음, poe.ninja 카드 시세로 약 ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		listedAt: (at: number) => `${listingDateTime(undefined, at)} 등록`,
		affixes: (prefixes: number, suffixes: number) =>
			`접두 ${prefixes} · 접미 ${suffixes}`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { other: `접두 ${prefixes}개` })}, ${plural(locale, suffixes, { other: `접미 ${suffixes}개` })}`,
		copyItem: "아이템 복사",
		copyItemTitle:
			"아이템을 게임 내 텍스트로 복사합니다. Path of Building이나 거래 사이트의 붙여넣기 검색에 사용할 수 있습니다",
		copied: "복사됨",
		copyFailed: "복사 실패",
		wiki: "위키",
		wikiTitle: (page: string) => `위키에서 ${page} 열기`,
		socketShortfall: (itemLevel: number, max: number) =>
			`아이템 레벨 ${itemLevel}: 소켓 최대 ${max}개`,
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "엠파워 젬",
			enlighten: "인라이튼 젬",
			enhance: "인핸스 젬",
			awakened: "각성 젬",
			any: "젬",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "투구, 장갑, 신발",
			shields: "방패",
			"one-handed": "한손 무기",
			any: "아이템",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems}은(는) 타락했을 때만 최대 ${maxLevel}레벨까지 올라갑니다. 최소 ${wanted} 조건에 맞는 아이템은 없습니다.`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems}은(는) 타락시켜야만 ${maxLevel}레벨을 넘을 수 있지만, 이 검색은 타락한 아이템을 제외합니다. ${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems}은(는) 타락했을 때만 품질이 최대 ${maxQuality}%까지 올라갑니다. 최소 ${wanted}% 조건에 맞는 아이템은 없습니다.`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems}은(는) 타락시켜야만 품질이 ${maxQuality}%를 넘을 수 있지만, 이 검색은 타락한 아이템을 제외합니다. ${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items}의 소켓은 최대 ${max}개이므로 최소 소켓 ${wanted}개 조건에 맞는 아이템은 없습니다.`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items}의 소켓은 최대 ${max}개이므로 최소 ${wanted}링크 조건에 맞는 아이템은 없습니다.`,
		mirroredAndCorrupted:
			"타락한 아이템은 복제할 수 없고, 복제된 아이템은 타락시킬 수 없습니다. 복제 또는 타락 중 하나를 ‘전체’로 설정하세요.",
		fracturedUnique:
			"고유 아이템에는 분열 속성이 붙지 않습니다. 분열을 ‘전체’로 설정하거나 다른 희귀도를 선택하세요.",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter}의 최솟값 ${min}이(가) 최댓값 ${max}보다 큽니다.`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`속성 그룹의 개수 또는 합계의 최솟값 ${min}이(가) 최댓값 ${max}보다 큽니다.`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`속성 필터의 최솟값 ${min}이(가) 최댓값 ${max}보다 큽니다.`,
	},
	sync: {
		off: "동기화가 꺼져 있습니다. 북마크는 이 기기에만 보관됩니다.",
		on: (ago: string | null, percent: number) =>
			`동기화됨${ago ? ` ${ago}` : ""} · 동기화 공간 ${percent}% 사용`,
		waiting: "다른 브라우저가 쓰는 중입니다. 잠시 후 다시 시도합니다.",
		quota:
			"브라우저 동기화에 비해 북마크가 너무 많습니다. 북마크는 이 기기에 안전하게 보관되어 있습니다. 일부를 보관하거나 삭제하면 동기화가 다시 시작됩니다.",
		newer:
			"다른 브라우저가 더 새로운 버전의 Exile Ledger로 동기화했습니다. 동기화를 다시 하려면 여기서 확장 프로그램을 업데이트하세요. 이 기기의 북마크는 안전합니다.",
		failed: "동기화에 실패했습니다.",
	},
	imports: {
		title: "백업 및 공유",
		description:
			"가져오기는 기존 폴더 옆에 새 폴더를 추가합니다. 이미 있는 항목은 바뀌거나 삭제되지 않습니다.",
		backupLabel: "전체 백업",
		backupHint:
			"모든 폴더, 북마크, 설정이 담긴 파일입니다. 기록은 이 기기에만 남습니다.",
		saveBackup: "백업 파일 저장",
		restoreLabel: "백업 파일에서 복원",
		restoreHint: "Exile Ledger가 저장한 파일을 선택하세요.",
		chooseFile: "파일 선택",
		shareLabel: "공유된 폴더 가져오기",
		shareHint:
			"패널의 폴더에서 ‘공유 문자열 복사’로 복사한 문자열이나 Better Trading, Poe Trade Plus, TFT에서 내보낸 내용을 붙여넣으세요.",
		shareInput: "공유 문자열",
		sharePlaceholder: "EL1:…",
		read: "읽기",
		restoreSettings: "설정도 복원",
		import: "가져오기",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)}, ${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `${summary}가 담긴 백업을 저장했습니다.`,
		imported: (summary: string) => `${summary}를 가져왔습니다.`,
		watchersFailed: (summary: string) =>
			`${summary}를 가져왔지만 백업의 감시 항목은 저장하지 못했습니다.`,
		backupFrom: (exportedAt: number, summary: string) =>
			`${new Date(exportedAt).toLocaleString(locale)} 백업: ${summary}.`,
		fromSource: (source: string, summary: string) => `${source}: ${summary}.`,
		saveFailed:
			"가져온 내용을 저장하지 못했습니다. 이 페이지를 새로고침한 뒤 다시 시도하세요.",
		skipped: (n: number) =>
			plural(locale, n, {
				other: `손상되었거나 너무 큰 항목 ${n}개를 건너뛰었습니다.`,
			}),
		queriesDropped: (n: number) =>
			plural(locale, n, {
				other: `저장된 검색이 너무 커서 북마크 ${n}개를 검색 없이 유지했습니다. 저장된 검색 ID로 열리며 감시할 수 없습니다.`,
			}),
		sources: {
			"exile-ledger": "공유된 폴더",
			"better-trading": "Better Trading 내보내기",
			"poe-trade-plus": "Poe Trade Plus 내보내기",
			tft: "TFT Trade Extension 내보내기",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "Exile Ledger 공유 문자열이 아닙니다.",
			"share-damaged": "공유 문자열이 손상되었거나 불완전합니다.",
			"share-empty": "공유 문자열에 폴더가 없습니다.",
			"not-backup": "Exile Ledger 백업 파일이 아니거나 손상된 파일입니다.",
			"unknown-format":
				"Exile Ledger, Better Trading, Poe Trade Plus에서 내보낸 내용이 아닙니다.",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Exile Ledger 설정",
		versionLine: (version: string) => `설정 · 버전 ${version}`,
		panel: {
			title: "패널",
			description: "거래 사이트에서 패널이 놓이는 방식입니다.",
			side: "고정 위치",
			sides: { left: "왼쪽", right: "오른쪽" },
			layout: "레이아웃",
			layoutHint:
				"페이지 위에 띄우거나, 페이지를 옆으로 밀어 패널이 결과를 가리지 않게 합니다.",
			modes: { overlay: "위에 띄우기", push: "옆으로 밀기" },
			width: "너비",
			widthHintPercent: (minPx: number, maxPx: number) =>
				`브라우저 창 너비의 백분율이라 패널이 창과 함께 넓어지고 좁아집니다. 단, ${minPx}px보다 좁아지거나 ${maxPx}px보다 넓어지지 않습니다. 패널의 안쪽 가장자리를 드래그해도 됩니다.`,
			widthHintPx: (minPx: number, maxPx: number) =>
				`창 크기와 관계없이 고정된 픽셀 너비이며 ${minPx}px에서 ${maxPx}px 사이입니다. 패널의 안쪽 가장자리를 드래그해도 됩니다.`,
			widthUnit: "너비 단위",
			widthUnits: { percent: "%", px: "px" } satisfies Record<
				PanelWidthUnit,
				string
			>,
			widthInput: "패널 너비",
		},
		appearance: {
			title: "모양",
			description:
				"패널, 이 페이지, 그리고 Exile Ledger가 거래 결과에 추가하는 표시의 색상입니다.",
			theme: "테마",
			themes: {
				gold: "다크 골드",
				blood: "블러드",
				verdant: "버던트",
				azure: "아주르",
				bone: "본",
			} satisfies Record<ThemeId, string>,
			language: "언어",
			languageHint:
				"영어 외의 언어는 기계 번역입니다. 원어민의 수정 제안은 GitHub에서 환영합니다.",
			languageAuto: "브라우저와 동일",
			compact: "간결 모드",
			compactHint: "패널의 행 높이를 줄여 더 많은 북마크가 들어갑니다.",
		},
		sync: {
			title: "동기화",
			description:
				"북마크와 폴더는 브라우저 계정을 통해 따라옵니다. 기록은 각 기기에만 남습니다.",
			toggle: "북마크 동기화",
			space: "동기화 공간",
		},
		results: {
			title: "결과",
			description: "거래 사이트 자체 결과 목록에 추가되는 기능입니다.",
			highlight: "검색한 옵션 강조",
			highlightHint: "각 결과에서 검색 필터에 사용한 옵션 줄을 표시합니다.",
			prices: "환산 가격",
			pricesHint:
				"각 가격을 카오스 오브와 디바인 오브(PoE1) 또는 엑잘티드 오브와 디바인 오브(PoE2)로 표시하며, 30분마다 갱신되는 poe.ninja 시세를 사용합니다. 켜면 poe.ninja를 읽을 권한을 요청합니다.",
			pricesMissingAccess:
				"환산 가격이 다른 브라우저에서는 켜져 있지만, 이 브라우저는 poe.ninja를 읽도록 허용되지 않았습니다. 스위치를 켜서 허용하세요.",
			listingTime: "정확한 등록 시각",
			listingTimeHint:
				"사이트에 표시되는 ‘2시간 전’ 옆에 각 아이템이 등록된 날짜와 시각을 표시합니다.",
			affixCount: "접두/접미 개수",
			affixCountHint:
				"사이트가 보내는 옵션 티어를 바탕으로 각 아이템의 접두와 접미 개수를 표시합니다.",
			itemTools: "아이템 복사 및 위키 링크",
			itemToolsHint:
				"아이템을 게임 내 텍스트로 복사하는 버튼과 아이템의 위키 페이지 링크를 추가합니다.",
			socketWarning: "소켓 경고 (PoE1)",
			socketWarningHint:
				"아이템 레벨 때문에 베이스의 소켓 수에 도달할 수 없는 아이템을 알려줍니다. 예를 들어 6소켓이 될 수 없는 6소켓 베이스입니다.",
			pricesDenied:
				"환산 가격에는 poe.ninja 접근 권한이 필요합니다. 변경된 것은 없습니다.",
		},
		trade: {
			title: "거래 사이트",
			tabTitles: "탭 제목",
			tabTitlesHint:
				"브라우저 탭에 북마크 이름 또는 아이템과 리그를 표시하고, 실시간 검색에는 ⚡를 붙입니다.",
			fuzzy: "유사 아이템 검색",
			fuzzyHint:
				"아이템 검색창에 입력을 시작하면 ~를 붙입니다. 공백으로 시작하면 정확히 검색합니다.",
			fuzzyFilters: "유사 속성 필터 검색",
			fuzzyFiltersHint: "속성 필터를 고르는 입력창에도 똑같이 적용됩니다.",
			backForward: "검색 사이 뒤로 및 앞으로",
			backForwardHint:
				"브라우저의 뒤로 버튼이 사이트를 떠나지 않고 이전 검색으로 돌아갑니다.",
		},
		watchers: {
			title: "감시",
			description:
				"감시 중인 매물과 검색은 GGG의 요청 제한이 허용하는 빈도 이내에서 백그라운드로 확인합니다.",
			access: "거래 사이트 접근",
			accessHint:
				"백그라운드 확인에 필요합니다. 브라우저가 한 번 묻고, 요청은 공식 거래 사이트로만 전송됩니다.",
			allowed: "허용됨",
			allow: "허용",
			denied: "허용되지 않음. 허용할 때까지 감시가 일시 중지됩니다.",
			interval: "확인 주기",
			intervalHint: (min: number) =>
				`새 감시 항목의 확인 사이 간격(분)이며 최소 ${min}분입니다. 확인에 실패할 때마다 대기 시간이 직전의 두 배가 됩니다.`,
			intervalInput: "확인 사이 간격(분)",
			notify: "알림",
			notifyHint:
				"감시 중인 매물이 판매되거나, 다시 등록되거나, 가격이 바뀌거나, 감시 중인 검색에 새 결과가 있으면 브라우저 알림을 보냅니다. 켜면 한 번 권한을 요청합니다.",
			notifyMissingAccess:
				"다른 브라우저에서 알림이 켜져 있지만 이 브라우저에서는 허용되지 않았습니다. 스위치를 켜서 여기에서 허용하세요.",
			notifyDenied:
				"알림에는 브라우저의 권한이 필요합니다. 변경된 것은 없습니다.",
		},
		hotkeys: {
			title: "키보드 단축키",
			description:
				"거래 사이트에서 사용합니다. 검색창 단축키는 검색창에 입력 중일 때도 작동합니다.",
			actions: {
				togglePanel: "패널 표시 또는 숨기기",
				focusItemSearch: "아이템 검색으로 이동",
				addStatFilter: "속성 필터 추가",
				clearSearch: "검색 지우기",
				focusMin: "속성 필터의 최솟값으로 이동",
				focusMax: "속성 필터의 최댓값으로 이동",
			} satisfies Record<HotkeyAction, string>,
			unbound: "설정 안 됨",
			recording: "키를 누르세요",
			recordingHint: "새 단축키를 누르세요. 취소하려면 Escape를 누르세요.",
			change: (action: string) => `${action} 단축키 변경`,
			remove: (action: string) => `${action} 단축키 제거`,
			reset: "기본값으로 되돌리기",
			reserved: (combo: string) =>
				`${combo}은(는) 브라우저 단축키입니다. 다른 키를 선택하세요.`,
			taken: (combo: string, action: string) =>
				`${combo}은(는) 이미 ‘${action}’에 사용 중입니다.`,
		},
		history: {
			title: "기록",
			record: "검색 기록 저장",
			recordHint: "이 기기에만 보관되며 게임당 최대 200개입니다.",
			clearAll: "모든 기록 지우기",
			clearAllHint: "두 게임 모두, 이 기기에서만 지웁니다.",
			clear: "기록 지우기",
			cleared: "기록을 지웠습니다.",
		},
		about: {
			title: "정보 및 개인정보",
			body: "Exile Ledger는 북마크를 브라우저에 보관하고 브라우저 계정을 통해 동기화합니다. 그 외에는 어디에도 전송하지 않습니다. 분석도, 추적도 없으며 Path of Exile 세션을 읽지도 않습니다. 사용자의 페이지가 보내는 거래 검색만 볼 수 있습니다.",
		},
	},
	popup: {
		version: (version: string) => `버전 ${version}`,
		body: "패널은 거래 사이트에 있습니다. 설정, 백업, 가져오기는 설정 페이지에서 할 수 있습니다.",
		openSettings: "설정 열기",
	},
};
