// UI translations. Add a key to BOTH languages when adding UI text.
// Values are strings, or functions for text with numbers / variables.
const SETTINGS_KEY = 'reel-words:settings';

export const LANGS = { en: 'English', zh: '中文' };

function detect() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    if (s.lang in LANGS) return s.lang;
  } catch { /* ignore */ }
  return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
}

let lang = detect();
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

export const getLang = () => lang;
export const locale = () => (lang === 'zh' ? 'zh-CN' : 'en-US');
export function setLang(l) {
  if (!(l in LANGS)) return;
  lang = l;
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
}

export function t(key, ...args) {
  const v = DICT[lang]?.[key] ?? DICT.en[key];
  if (v === undefined) { console.warn('[i18n] missing key:', key); return key; }
  return typeof v === 'function' ? v(...args) : v;
}

const pl = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

const DICT = {
  /* ================================================================ EN */
  en: {
    'brand.sub': 'Movie English notebook',
    'nav.library': 'Library', 'nav.movies': 'Movies', 'nav.review': 'Review', 'nav.stats': 'Stats', 'nav.settings': 'Settings',
    'btn.newEntry': 'New entry',
    'streak': n => `<b>${n}</b> day streak`,

    'type.word': 'Word', 'type.phrase': 'Phrase', 'type.sentence': 'Sentence',
    'types.word': 'Words', 'types.phrase': 'Phrases', 'types.sentence': 'Sentences',
    'status.new': 'New', 'status.learning': 'Learning', 'status.mastered': 'Mastered',

    'count.entries': n => pl(n, 'entry', 'entries'),
    'count.titles': n => pl(n, 'title'),

    'time.justNow': 'just now', 'time.minAgo': n => `${n}m ago`, 'time.hAgo': n => `${n}h ago`,
    'time.yesterday': 'yesterday', 'time.daysAgo': n => `${n} days ago`,
    'span.min': n => `${n} min`, 'span.h': n => `${n} h`, 'span.day': n => (n === 1 ? '1 day' : `${n} days`),
    'span.mo': n => `${n} mo`, 'span.yr': n => `${n} yr`,

    'common.close': 'Close', 'common.cancel': 'Cancel', 'common.ok': 'OK', 'common.save': 'Save', 'common.delete': 'Delete',
    'toast.noSpeech': 'Speech is not supported in this browser',
    'toast.deleted': s => `Deleted “${s}”`, 'toast.undo': 'Undo', 'toast.restored': 'Restored',
    'toast.updated': 'Updated', 'toast.saved': 'Saved', 'toast.savedDup': 'Saved (you’ve logged this one before)',
    'toast.updatedN': n => `Updated ${pl(n, 'entry', 'entries')}`,
    'toast.storageFail': 'Couldn’t open local storage (private browsing mode?)',

    'form.titleNew': 'New entry', 'form.titleEdit': 'Edit entry',
    'form.textPh': 'Type a word, phrase or line…', 'form.auto': 'Auto-detected', 'form.lookup': 'Look up',
    'form.meaning': 'Meaning', 'form.meaningPh': 'Definition or translation',
    'form.phonetic': 'Pronunciation', 'form.optional': 'optional',
    'form.movie': 'Movie / Show', 'form.moviePh': 'e.g. Friends S01E03', 'form.time': 'Timestamp',
    'form.context': 'Original line / context', 'form.contextPh': 'The line where you heard it — makes reviewing much more vivid',
    'form.notes': 'Notes', 'form.notesPh': 'Usage, synonyms, when to say it…',
    'form.tags': 'Tags', 'form.tagsHint': 'comma-separated', 'form.tagsPh': 'slang, idiom, work',
    'form.keepAdding': 'Keep adding', 'form.toSave': 'to save',

    'lookup.empty': 'Type something to look up first.',
    'lookup.sentence': 'Full sentences can’t be looked up — try the dictionary links above.',
    'lookup.loading': 'Looking up…',
    'lookup.hint': 'Click a definition to use it as the meaning (or add it to notes).',
    'lookup.fail': 'No result (it may be slang, a name, or you’re offline). Try the dictionary links above.',
    'lookup.ytitle': 'Hear it in real videos',

    'library.emptySub': 'Your personal movie-English notebook',
    'library.emptyTitle': 'Start with your first movie',
    'library.emptyBody': 'Heard a great word or a natural expression? Press <kbd>N</kbd> or tap the button below to save it in seconds — then review it with spaced repetition until it sticks.',
    'library.addFirst': 'Add your first entry', 'library.loadSample': 'Load sample data',
    'library.sub': (n, m) => `${pl(n, 'entry', 'entries')} · from ${pl(m, 'title')}`,
    'library.searchPh': 'Search words, meanings, lines, notes…',
    'filter.all': 'All', 'filter.allTitles': 'All titles', 'filter.allTags': 'All tags',
    'filter.anyStatus': 'Any status', 'filter.starred': '★ Starred',
    'sort.newest': 'Newest first', 'sort.oldest': 'Oldest first', 'sort.az': 'A → Z', 'sort.due': 'Due soonest', 'sort.movie': 'By title',
    'results': n => pl(n, 'result'), 'clearFilters': 'Clear filters',
    'noMatch.title': 'Nothing matches', 'noMatch.body': 'Try a different search, or clear the filters.',
    'card.speak': 'Read aloud', 'card.star': 'Star', 'card.noMeaning': 'No meaning yet', 'card.noTitle': 'No title',

    'movies.sub': (n, u) => pl(n, 'title') + (u ? ` · ${u} without a title` : ''),
    'movies.rename': 'Rename', 'movies.addFor': 'Add an entry for this title',
    'movies.mix': (w, p, s) => `${w} words · ${p} phrases · ${s} sentences`,
    'movies.emptyTitle': 'No movies yet',
    'movies.emptyBody': 'Fill in “Movie / Show” when you add an entry and your movie wall builds itself.',
    'movies.renameTitle': 'Rename title', 'movies.renameLabel': 'New name (updates every related entry)',

    'review.sub': 'Spaced repetition — see each card again right before you’d forget it',
    'review.emptyTitle': 'Nothing to review yet', 'review.emptyBody': 'Add a few entries first.',
    'review.dueToday': 'DUE TODAY',
    'review.dueDesc': (nw, old) => `${nw} new, ${old} due for review.`,
    'review.allDone': 'All caught up for today 🎉 Try a round of free practice.',
    'review.start': 'Start review', 'review.practice': n => `Practice ${n} random`,
    'review.options': 'OPTIONS', 'review.scope': 'Scope', 'review.allTitlesDue': n => `All titles (${n} due)`,
    'review.direction': 'Direction', 'review.forward': 'English → Meaning', 'review.reverse': 'Meaning → English',
    'review.shortcuts': 'Shortcuts: <kbd>Space</kbd> flip, <kbd>1</kbd>–<kbd>4</kbd> grade, <kbd>P</kbd> read aloud. Free practice doesn’t change your schedule.',
    'review.noMeaning': 'None of these have a meaning yet, so they can’t be reviewed in reverse',
    'review.end': 'End', 'review.practiceTag': 'Practice', 'review.showAnswer': 'Show answer', 'key.space': 'Space',
    'grade.0': 'Again', 'grade.1': 'Hard', 'grade.2': 'Good', 'grade.3': 'Easy',
    'summary.practiceDone': 'Practice complete', 'summary.reviewDone': 'Review complete',
    'summary.line': (n, r) => `${pl(n, 'card')} reviewed · ${r}% recalled`,
    'summary.done': 'Done', 'summary.viewStats': 'View stats',

    'stats.emptyTitle': 'No data yet', 'stats.emptyBody': 'Add a few entries and your progress will show up here.',
    'stats.since': (d, n) => `Since ${d} · ${pl(n, 'active day')}`,
    'kpi.total': 'Total entries', 'kpi.last7': 'Last 7 days', 'kpi.perDay': x => `${x} per day`,
    'kpi.streak': 'Streak', 'kpi.daysUnit': n => (n === 1 ? 'day' : 'days'), 'kpi.unit': '',
    'kpi.keepGoing': 'Keep it going 🔥', 'kpi.oneADay': 'One entry a day is enough',
    'kpi.mastered': 'Mastered', 'kpi.mix': (l, n) => `${l} learning · ${n} new`,
    'stats.activity': w => `ACTIVITY · LAST ${w} WEEKS`, 'stats.less': 'Less', 'stats.more': 'More',
    'stats.byType': 'BY TYPE', 'stats.progress': 'PROGRESS', 'stats.masteredLong': 'Mastered (interval ≥ 21 days)',
    'stats.topTitles': 'TOP TITLES', 'stats.noTitles': 'No entries with a title yet', 'stats.topTags': 'TOP TAGS',
    'heat.cell': (d, n) => `${d}: ${pl(n, 'entry', 'entries')}`,

    'settings.subSynced': 'Your entries are backed up to your account.',
    'settings.subLocal': 'Your data lives only in this browser on this device — sign in or export a backup now and then.',
    'settings.appearance': 'APPEARANCE',
    'settings.theme': 'Theme', 'settings.themeDesc': 'Follow your system, or pick light or dark',
    'theme.system': 'System', 'theme.light': 'Light', 'theme.dark': 'Dark',
    'settings.language': 'Language', 'settings.languageDesc': 'Interface language',
    'settings.speech': 'SPEECH', 'settings.voice': 'Voice',
    'settings.voicesN': n => `${pl(n, 'English voice')} available`, 'settings.voiceDefault': 'Using the browser default',
    'settings.auto': 'Automatic', 'settings.speed': 'Speed', 'settings.test': 'Test',
    'settings.data': 'DATA',
    'settings.export': 'Export', 'settings.exportDesc': 'JSON is a full backup; CSV opens in Excel or imports into Anki',
    'settings.import': 'Import', 'settings.importDesc': 'Restore from a JSON backup — for duplicates, the newer version wins',
    'settings.chooseFile': 'Choose file',
    'settings.sample': 'Sample data', 'settings.sampleDesc': 'Add a few example entries to see how it works', 'settings.loadSamples': 'Load samples',
    'settings.deleteAll': 'Delete everything', 'settings.deleteAllDesc': n => `Permanently removes all ${pl(n, 'entry', 'entries')}`,
    'settings.deleteAllBtn': 'Delete all',
    'settings.shortcuts': 'KEYBOARD SHORTCUTS',
    'sc.new': 'New entry', 'sc.search': 'Search', 'sc.save': 'Save entry', 'sc.close': 'Close dialog',
    'sc.flip': 'Flip card during review', 'sc.grade': 'Grade: Again / Hard / Good / Easy', 'sc.read': 'Read the current card aloud',
    'settings.about': 'ABOUT', 'settings.privacy': 'Privacy Policy', 'settings.privacyDesc': 'What we store and how to delete it',
    'settings.read': 'Read', 'settings.openSource': 'Open source', 'settings.openSourceDesc': 'Report a bug or suggest a feature',
    'settings.testPhrase': 'Here’s looking at you, kid.',

    'toast.exported': n => `Exported ${pl(n, 'entry', 'entries')}`,
    'csv.header': ['Text', 'Meaning', 'Type', 'Pronunciation', 'Title', 'Timestamp', 'Context', 'Notes', 'Tags', 'Created'],
    'toast.importDone': (a, u) => `Import done: ${a} added, ${u} updated`,
    'toast.importFail': m => `Import failed: ${m}`, 'import.badFormat': 'unrecognised format', 'import.unreadable': 'could not read the file',
    'toast.sampleAdded': n => `Added ${n} sample entries`,
    'clear.title': 'Delete everything?',
    'clear.body': (n, all) => `This permanently deletes all <b>${n}</b> entries${all ? ' on <b>all your devices</b>' : ''} and can’t be undone. Consider exporting a JSON backup first.`,
    'toast.cleared': 'All data deleted',

    'sync.loading': 'Connecting…', 'sync.syncing': 'Syncing…', 'sync.synced': w => `Synced ${w}`,
    'sync.offline': 'Offline — will sync later', 'sync.error': 'Sync failed — will retry',
    'sync.pending': n => `${n} change${n === 1 ? '' : 's'} waiting`,
    'sync.signedIn': e => `Signed in as ${e}`, 'sync.linkFailed': m => `Sign-in failed: ${m}`, 'sync.libFail': 'Could not load the sync library',
    'account.signIn': 'Sign in to sync', 'account.signInSub': 'Back up & use on any device',
    'account.panel': 'ACCOUNT & SYNC', 'account.panelDesc': 'Back up your entries to the cloud and use them on any device.',
    'account.syncNow': 'Sync now', 'account.signOut': 'Sign out',
    'account.delete': 'Delete account', 'account.deleteDesc': 'Permanently deletes your account and every synced entry',
    'signin.ph': 'you@example.com', 'signin.send': 'Send sign-in link', 'signin.sending': 'Sending…',
    'signin.hint': 'We’ll email you a link — no password needed. Open it in this browser.',
    'signin.agree': 'By signing in, you agree to our <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.',
    'signin.modalBody': 'Your entries will be backed up and kept in sync across all your devices. Anything already on this device is added to your account.',
    'signin.invalid': 'Please enter a valid email address.',
    'signin.check': e => `📬 Check your inbox at <b>${e}</b> and open the link <b>in this browser</b> to finish signing in.`,
    'signin.didntGet': 'Didn’t get it? Check spam, or wait a minute and try again.',
    'signin.fail': m => `Couldn’t send the link: ${m}`,
    'signout.title': 'Sign out?',
    'signout.body': 'Your entries are safe in your account. They’ll be removed from this device and come back when you sign in again.',
    'signout.unsyncedTitle': 'Some changes haven’t synced',
    'signout.unsyncedBody': n => `${n} change${n === 1 ? '' : 's'} couldn’t be uploaded (are you offline?). If you sign out now, they’ll be lost.`,
    'signout.anyway': 'Sign out anyway', 'toast.signedOut': 'Signed out',
    'delacc.title': 'Delete your account?',
    'delacc.body': 'This permanently deletes your account and <b>every entry stored in the cloud</b>, on all devices. It can’t be undone. Export a JSON backup first if you want to keep anything.',
    'toast.accountDeleted': 'Account deleted', 'toast.deleteFail': m => `Couldn’t delete account: ${m}`,
    'error.unknown': 'unknown error',
  },

  /* ================================================================ ZH */
  zh: {
    'brand.sub': '影视英语词句本',
    'nav.library': '词句本', 'nav.movies': '影视', 'nav.review': '复习', 'nav.stats': '统计', 'nav.settings': '设置',
    'btn.newEntry': '记一条',
    'streak': n => `连续记录 <b>${n}</b> 天`,

    'type.word': '单词', 'type.phrase': '短语', 'type.sentence': '句子',
    'types.word': '单词', 'types.phrase': '短语', 'types.sentence': '句子',
    'status.new': '新记录', 'status.learning': '学习中', 'status.mastered': '已掌握',

    'count.entries': n => `${n} 条记录`,
    'count.titles': n => `${n} 部影视`,

    'time.justNow': '刚刚', 'time.minAgo': n => `${n} 分钟前`, 'time.hAgo': n => `${n} 小时前`,
    'time.yesterday': '昨天', 'time.daysAgo': n => `${n} 天前`,
    'span.min': n => `${n} 分钟`, 'span.h': n => `${n} 小时`, 'span.day': n => `${n} 天`,
    'span.mo': n => `${n} 个月`, 'span.yr': n => `${n} 年`,

    'common.close': '关闭', 'common.cancel': '取消', 'common.ok': '确定', 'common.save': '保存', 'common.delete': '删除',
    'toast.noSpeech': '当前浏览器不支持朗读',
    'toast.deleted': s => `已删除「${s}」`, 'toast.undo': '撤销', 'toast.restored': '已恢复',
    'toast.updated': '已更新', 'toast.saved': '已保存', 'toast.savedDup': '已保存（之前也记过这条哦）',
    'toast.updatedN': n => `已更新 ${n} 条记录`,
    'toast.storageFail': '无法打开本地数据库（可能处于无痕模式）',

    'form.titleNew': '记一条', 'form.titleEdit': '编辑记录',
    'form.textPh': '输入单词、短语或句子…', 'form.auto': '自动识别', 'form.lookup': '查词',
    'form.meaning': '释义', 'form.meaningPh': '中文意思或你的理解',
    'form.phonetic': '音标', 'form.optional': '可选',
    'form.movie': '电影 / 剧集', 'form.moviePh': '例如 Friends S01E03', 'form.time': '时间点',
    'form.context': '台词原句 / 上下文', 'form.contextPh': '把出现这个词的那句台词记下来，复习时更有画面感',
    'form.notes': '笔记', 'form.notesPh': '用法、近义词、使用场景……',
    'form.tags': '标签', 'form.tagsHint': '用逗号分隔', 'form.tagsPh': '俚语, 口语, 职场',
    'form.keepAdding': '保存后继续记', 'form.toSave': '保存',

    'lookup.empty': '先输入要查的内容',
    'lookup.sentence': '句子没法直接查词典，可以试试上方的外部词典链接。',
    'lookup.loading': '查询中…',
    'lookup.hint': '英文释义：点击可填入“释义”（已有内容时追加到笔记）',
    'lookup.fail': '没查到这个词（可能是俚语、专有名词或网络不可用）。试试上方的有道 / 剑桥链接。',
    'lookup.ytitle': '听真实视频里的发音',

    'library.emptySub': '你的私人影视英语笔记',
    'library.emptyTitle': '从第一部电影开始',
    'library.emptyBody': '看电影时听到一个好词、一句地道表达？按 <kbd>N</kbd> 或点下方按钮，几秒钟就能记下来，之后用间隔重复复习，让它真正变成你的。',
    'library.addFirst': '记第一条', 'library.loadSample': '加载示例数据',
    'library.sub': (n, m) => `${n} 条记录 · 来自 ${m} 部影视`,
    'library.searchPh': '搜索单词、释义、台词、笔记…',
    'filter.all': '全部', 'filter.allTitles': '全部影视', 'filter.allTags': '全部标签',
    'filter.anyStatus': '全部状态', 'filter.starred': '★ 收藏',
    'sort.newest': '最新记录', 'sort.oldest': '最早记录', 'sort.az': 'A → Z', 'sort.due': '最该复习', 'sort.movie': '按影视',
    'results': n => `找到 ${n} 条`, 'clearFilters': '清除筛选',
    'noMatch.title': '没有匹配的记录', 'noMatch.body': '换个关键词，或者清除筛选条件看看。',
    'card.speak': '朗读', 'card.star': '收藏', 'card.noMeaning': '还没写释义', 'card.noTitle': '未标注影视',

    'movies.sub': (n, u) => `${n} 部影视` + (u ? ` · ${u} 条未标注` : ''),
    'movies.rename': '重命名', 'movies.addFor': '给这部影视记一条',
    'movies.mix': (w, p, s) => `单词 ${w} · 短语 ${p} · 句子 ${s}`,
    'movies.emptyTitle': '还没有影视',
    'movies.emptyBody': '记录时填写“电影 / 剧集”，这里就会自动生成你的影视墙。',
    'movies.renameTitle': '重命名影视', 'movies.renameLabel': '新名称（会同步更新所有相关记录）',

    'review.sub': '基于间隔重复，在快忘记的时候再见一次',
    'review.emptyTitle': '还没有可以复习的内容', 'review.emptyBody': '先去记几条吧。',
    'review.dueToday': '今日待复习',
    'review.dueDesc': (nw, old) => `其中 ${nw} 条是新记录，${old} 条到期复习。`,
    'review.allDone': '今天的复习都完成啦 🎉 可以来一轮随机练习。',
    'review.start': '开始复习', 'review.practice': n => `随机练习 ${n} 条`,
    'review.options': '复习设置', 'review.scope': '范围', 'review.allTitlesDue': n => `全部影视（${n} 条待复习）`,
    'review.direction': '方向', 'review.forward': '看英文 → 想意思', 'review.reverse': '看意思 → 想英文',
    'review.shortcuts': '快捷键：<kbd>空格</kbd> 翻面，<kbd>1</kbd>–<kbd>4</kbd> 评分，<kbd>P</kbd> 朗读。随机练习不影响复习计划。',
    'review.noMeaning': '这些记录都还没有释义，没法反向复习',
    'review.end': '结束', 'review.practiceTag': '练习', 'review.showAnswer': '显示答案', 'key.space': '空格',
    'grade.0': '忘了', 'grade.1': '模糊', 'grade.2': '记得', 'grade.3': '简单',
    'summary.practiceDone': '练习完成', 'summary.reviewDone': '本轮复习完成',
    'summary.line': (n, r) => `共复习 ${n} 条，记得率 ${r}%`,
    'summary.done': '完成', 'summary.viewStats': '查看统计',

    'stats.emptyTitle': '还没有数据', 'stats.emptyBody': '记录几条之后，这里会显示你的学习轨迹。',
    'stats.since': (d, n) => `从 ${d} 开始，共记录 ${n} 天`,
    'kpi.total': '总记录', 'kpi.last7': '近 7 天新增', 'kpi.perDay': x => `日均 ${x} 条`,
    'kpi.streak': '连续记录', 'kpi.daysUnit': () => '天', 'kpi.unit': '条',
    'kpi.keepGoing': '保持住 🔥', 'kpi.oneADay': '每天记一条就好',
    'kpi.mastered': '已掌握', 'kpi.mix': (l, n) => `学习中 ${l} · 新 ${n}`,
    'stats.activity': w => `记录热力图 · 最近 ${w} 周`, 'stats.less': '少', 'stats.more': '多',
    'stats.byType': '类型分布', 'stats.progress': '掌握程度', 'stats.masteredLong': '已掌握（间隔 ≥ 21 天）',
    'stats.topTitles': '记录最多的影视', 'stats.noTitles': '还没有标注影视的记录', 'stats.topTags': '常用标签',
    'heat.cell': (d, n) => `${d}：${n} 条`,

    'settings.subSynced': '你的记录已备份到账号中。',
    'settings.subLocal': '数据只保存在这台设备的浏览器里——建议登录同步，或定期导出备份。',
    'settings.appearance': '外观',
    'settings.theme': '主题', 'settings.themeDesc': '跟随系统，或固定为浅色 / 深色',
    'theme.system': '跟随系统', 'theme.light': '浅色', 'theme.dark': '深色',
    'settings.language': '语言', 'settings.languageDesc': '界面显示语言',
    'settings.speech': '朗读', 'settings.voice': '英文语音',
    'settings.voicesN': n => `系统共有 ${n} 个英文语音`, 'settings.voiceDefault': '使用浏览器默认语音',
    'settings.auto': '自动选择', 'settings.speed': '语速', 'settings.test': '试听',
    'settings.data': '数据',
    'settings.export': '导出备份', 'settings.exportDesc': 'JSON 可以完整恢复；CSV 可以用 Excel 打开或导入 Anki',
    'settings.import': '导入', 'settings.importDesc': '从 JSON 备份导入，相同记录会保留较新的版本',
    'settings.chooseFile': '选择文件',
    'settings.sample': '示例数据', 'settings.sampleDesc': '添加几条示例，看看效果', 'settings.loadSamples': '加载示例',
    'settings.deleteAll': '清空所有数据', 'settings.deleteAllDesc': n => `删除全部 ${n} 条记录，无法撤销`,
    'settings.deleteAllBtn': '清空',
    'settings.shortcuts': '快捷键',
    'sc.new': '记一条', 'sc.search': '搜索', 'sc.save': '保存记录', 'sc.close': '关闭弹窗',
    'sc.flip': '复习时翻面', 'sc.grade': '复习评分：忘了 / 模糊 / 记得 / 简单', 'sc.read': '复习时朗读当前卡片',
    'settings.about': '关于', 'settings.privacy': '隐私政策', 'settings.privacyDesc': '我们保存了什么数据，以及如何删除',
    'settings.read': '查看', 'settings.openSource': '开源项目', 'settings.openSourceDesc': '反馈问题或建议新功能',
    'settings.testPhrase': 'Here’s looking at you, kid.',

    'toast.exported': n => `已导出 ${n} 条`,
    'csv.header': ['内容', '释义', '类型', '音标', '影视', '时间点', '台词', '笔记', '标签', '记录时间'],
    'toast.importDone': (a, u) => `导入完成：新增 ${a} 条，更新 ${u} 条`,
    'toast.importFail': m => `导入失败：${m}`, 'import.badFormat': '文件格式不对', 'import.unreadable': '文件无法解析',
    'toast.sampleAdded': n => `已添加 ${n} 条示例`,
    'clear.title': '清空所有数据？',
    'clear.body': (n, all) => `将永久删除全部 <b>${n}</b> 条记录${all ? '（<b>所有设备</b>上都会删除）' : ''}，无法撤销。建议先导出一份 JSON 备份。`,
    'toast.cleared': '已清空',

    'sync.loading': '连接中…', 'sync.syncing': '同步中…', 'sync.synced': w => `已同步 · ${w}`,
    'sync.offline': '离线 · 联网后自动同步', 'sync.error': '同步失败 · 稍后重试',
    'sync.pending': n => `${n} 处改动待上传`,
    'sync.signedIn': e => `已登录：${e}`, 'sync.linkFailed': m => `登录失败：${m}`, 'sync.libFail': '同步组件加载失败',
    'account.signIn': '登录以同步', 'account.signInSub': '云端备份，多设备使用',
    'account.panel': '账号与同步', 'account.panelDesc': '把记录备份到云端，在任何设备上使用。',
    'account.syncNow': '立即同步', 'account.signOut': '退出登录',
    'account.delete': '注销账号', 'account.deleteDesc': '永久删除你的账号和所有云端记录',
    'signin.ph': 'you@example.com', 'signin.send': '发送登录链接', 'signin.sending': '发送中…',
    'signin.hint': '我们会给你发一封带登录链接的邮件，无需密码。请在当前浏览器中打开链接。',
    'signin.agree': '登录即表示你同意我们的<a href="privacy.html" target="_blank" rel="noopener">隐私政策</a>。',
    'signin.modalBody': '你的记录会备份到云端，并在所有设备间保持同步。这台设备上已有的记录会合并进你的账号。',
    'signin.invalid': '请输入有效的邮箱地址。',
    'signin.check': e => `📬 请查收 <b>${e}</b> 的邮件，并<b>在当前浏览器中</b>打开链接完成登录。`,
    'signin.didntGet': '没收到？看看垃圾邮件，或者等一分钟后重试。',
    'signin.fail': m => `发送失败：${m}`,
    'signout.title': '退出登录？',
    'signout.body': '你的记录已安全保存在账号中。退出后会从这台设备上移除，重新登录即可恢复。',
    'signout.unsyncedTitle': '还有改动没有同步',
    'signout.unsyncedBody': n => `有 ${n} 处改动没能上传（可能处于离线状态）。现在退出的话，这些改动会丢失。`,
    'signout.anyway': '仍然退出', 'toast.signedOut': '已退出登录',
    'delacc.title': '注销账号？',
    'delacc.body': '将永久删除你的账号和<b>云端保存的所有记录</b>（所有设备），无法撤销。如需保留，请先导出 JSON 备份。',
    'toast.accountDeleted': '账号已注销', 'toast.deleteFail': m => `注销失败：${m}`,
    'error.unknown': '未知错误',
  },
};
