import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Icon from './icons';
import { languages, topics, topicGroups, totalExercises, migrateProgress, lessonFor } from './curriculum';
import type { AuthState, CheckResult, LanguageId, Progress, RunResult, Runtime, TopicId } from './types';

const CodeEditor = lazy(() => import('./editor'));
const initial: Progress = { drafts: {}, completed: [], hints: {}, selectedLanguage: 'javascript', selectedTopic: 'branches' };
type Page = 'learn' | 'overview' | 'resources' | 'settings';
type Evidence = { code: string; check: CheckResult };

function errorText(error: unknown) { return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : String(error); }

export default function App() {
  const [progress, setProgress] = useState<Progress>(initial);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState('已儲存於此裝置');
  const [topicSearch, setTopicSearch] = useState('');
  const [page, setPage] = useState<Page>('learn');
  const [runtimes, setRuntimes] = useState<Partial<Record<LanguageId, Runtime>>>({});
  const [auth, setAuth] = useState<AuthState>({ available: false, loggedIn: false, message: '尚未檢查連線' });
  const [authBusy, setAuthBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<'split' | 'lesson' | 'code'>('split');
  const [resultsOpen, setResultsOpen] = useState(true);
  const [lessonTab, setLessonTab] = useState<'lesson' | 'compare' | 'practice'>('lesson');
  const [resultTab, setResultTab] = useState<'output' | 'tests' | 'ai'>('output');
  const [output, setOutput] = useState<RunResult | null>(null);
  const [evidence, setEvidence] = useState<Record<string, Evidence>>({});
  const [aiReviews, setAiReviews] = useState<Record<string, { code: string; text: string }>>({});
  const [stdin, setStdin] = useState('5');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'solution' | 'reset' | null>(null);
  const [toast, setToast] = useState('');
  const [environmentBusy, setEnvironmentBusy] = useState(false);
  const language = progress.selectedLanguage;
  const topic = progress.selectedTopic;
  const key = `${language}:${topic}`;
  const lang = languages.find(l => l.id === language)!;
  const topicInfo = topics.find(t => t.id === topic)!;
  const lesson = lessonFor(language, topic);
  const code = progress.drafts[key] ?? lesson.starter;
  const currentEvidence = evidence[key];
  const currentReview = aiReviews[key];
  const stale = currentEvidence && currentEvidence.code !== code;
  const locked = busy || aiBusy;
  const lessonScrollRef = useRef<HTMLDivElement>(null);
  const latestCode = useRef(code);
  latestCode.current = code;
  const latestProgress = useRef(progress);
  latestProgress.current = progress;

  useEffect(() => window.studio?.onClosing(() => window.studio!.save(latestProgress.current)), []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const saved = window.studio ? await window.studio.load() : JSON.parse(localStorage.getItem('syntax-studio-progress') || 'null');
        const migrated = migrateProgress(saved);
        if (alive && migrated) setProgress({ ...initial, ...migrated });
      } catch { if (alive) setToast('無法讀取既有進度，請確認資料儲存權限。'); }
      finally { if (alive) setLoaded(true); }
    };
    void load();
    if (window.studio) void window.studio.runtimes().then(value => { if (alive) setRuntimes(value); }).catch(() => { if (alive) setToast('執行環境偵測失敗，請到設定重新整理。'); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveState('正在儲存…');
    const timer = setTimeout(() => {
      const save = window.studio ? window.studio.save(progress) : Promise.resolve().then(() => localStorage.setItem('syntax-studio-progress', JSON.stringify(progress)));
      void save.then(() => setSaveState('已儲存於此裝置')).catch(() => setSaveState('儲存失敗，請勿關閉程式'));
    }, 350);
    return () => clearTimeout(timer);
  }, [progress, loaded]);

  useEffect(() => { setStdin(lessonFor(language, topic).tests[0].input); setOutput(null); setError(''); setResultTab('output'); }, [language, topic]);
  useEffect(() => { setLessonTab('lesson'); }, [topic]);
  useEffect(() => { lessonScrollRef.current?.scrollTo({ top: 0 }); }, [key, lessonTab]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (page === 'settings' && window.studio) void refreshAuth();
  }, [page]);

  const updateCode = (value: string) => setProgress(p => ({ ...p, drafts: { ...p.drafts, [key]: value } }));
  const selectTopic = (id: TopicId) => { if (!locked) { setPage('learn'); setProgress(p => ({ ...p, selectedTopic: id })); } };
  const open = async (url: string) => {
    try { if (window.studio) await window.studio.openExternal(url); else window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (e) { setToast(errorText(e)); }
  };
  const refreshAuth = async () => {
    if (!window.studio) return;
    setAuthBusy(true);
    try { setAuth(await window.studio.authStatus()); } catch (e) { setToast(errorText(e)); }
    finally { setAuthBusy(false); }
  };
  const refreshEnvironment = async () => {
    if (!window.studio) return;
    setEnvironmentBusy(true);
    try { setRuntimes(await window.studio.runtimes()); } catch (e) { setToast(errorText(e)); }
    finally { setEnvironmentBusy(false); }
  };

  const run = async () => {
    if (locked) return;
    setResultTab('output'); setResultsOpen(true); setError('');
    if (!window.studio) { setError('實際執行需要 Windows 桌面版。請開啟 Syntax Studio 桌面 App。'); return; }
    setBusy(true);
    try { setOutput(await window.studio.run({ language, code: latestCode.current, stdin })); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };
  const check = async () => {
    if (locked) return;
    setResultTab('tests'); setResultsOpen(true); setError('');
    if (!window.studio) { setError('測試驗證需要 Windows 桌面版，不會以模擬結果判定通過。'); return; }
    setBusy(true);
    const submitted = code;
    try {
      const checked = await window.studio.check({ language, code: submitted, tests: lesson.tests });
      setEvidence(p => ({ ...p, [key]: { code: submitted, check: checked } }));
      if (checked.passed) {
        setProgress(p => ({ ...p, completed: p.completed.includes(key) ? p.completed : [...p.completed, key] }));
        setToast('本題練習通過！可以繼續下一個主題，或切換語言比較。');
      }
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };
  const review = async () => {
    if (locked) return;
    setResultTab('ai'); setResultsOpen(true); setError('');
    if (!window.studio) { setError('AI 評閱需從桌面版連結 ChatGPT 帳戶。'); return; }
    setAiBusy(true);
    const submitted = code;
    try {
      const text = await window.studio.review({ language: lang.name, topic: topicInfo.name, task: lesson.task, code: submitted, results: currentEvidence?.code === submitted ? JSON.stringify(currentEvidence.check) : '此版本程式尚未實際執行測試，請勿聲稱已通過。' });
      setAiReviews(p => ({ ...p, [key]: { code: submitted, text } }));
    } catch (e) { setError(errorText(e)); }
    finally { setAiBusy(false); }
  };

  const visibleKeys = new Set(languages.flatMap(l => topics.map(t => `${l.id}:${t.id}`)));
  const completedCount = new Set(progress.completed.filter(id => visibleKeys.has(id))).size;
  const currentLanguageDone = topics.filter(t => progress.completed.includes(`${language}:${t.id}`)).length;

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setPage('overview')} aria-label="Syntax Studio 學習總覽"><span className="brand-symbol">{'{'}<i>↗</i>{'}'}</span><span>Syntax<span className="brand-light">Studio</span><small>語法之間</small></span></button>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav className="main-nav" aria-label="主要導覽">
        <button className={page === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('overview')}><Icon name="grid"/>學習總覽</button>
        <button className={page === 'learn' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('learn')}><Icon name="code"/>學習工作台<span className="tiny-dot"/></button>
        <button className={page === 'resources' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('resources')}><Icon name="book"/>學習資源</button>
      </nav>
      <div className="sidebar-divider"/>
      <div className="course-label">課程主題 <span>{topics.length}</span></div>
      <input className="topic-search" type="search" aria-label="搜尋課程主題" placeholder="搜尋主題…" value={topicSearch} onChange={e => setTopicSearch(e.target.value)}/>
      <nav className="topic-nav" aria-label="課程主題">{topicGroups.map(group => {
        const items = topics.filter(t => t.group === group.id && (t.name + t.english).toLowerCase().includes(topicSearch.toLowerCase()));
        if (!items.length) return null;
        return <details className="topic-group" open key={group.id}><summary>{group.name}<small>{items.length}</small><Icon name="chevron" size={12}/></summary>{items.map(t => {
          const done = progress.completed.includes(`${language}:${t.id}`);
          return <button key={t.id} disabled={locked} className={`topic-link ${page === 'learn' && topic === t.id ? 'selected' : ''}`} onClick={() => selectTopic(t.id)}><span className={`topic-number ${done ? 'done' : ''}`}>{done ? <Icon name="check" size={13}/> : String(topics.indexOf(t) + 1).padStart(2,'0')}</span><span>{t.name}</span>{topic === t.id && page === 'learn' && <span className="topic-indicator"/>}</button>;
        })}</details>;
      })}{!topics.some(t => (t.name + t.english).toLowerCase().includes(topicSearch.toLowerCase())) && <p className="no-topics">找不到符合的主題。</p>}</nav>
      <div className="sidebar-bottom">
        <div className="journey-card" aria-label="全部學習進度"><div><span>學習進度</span><span className="journey-count">{completedCount} / {totalExercises}</span></div><div className="journey-track"><span style={{ width: `${completedCount / totalExercises * 100}%` }}/></div></div>
        <button className={`nav-item settings-nav ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}><Icon name="settings"/>環境與設定<Icon name="chevron" size={15}/></button>
        <div className="sidebar-foot"><span className="status-dot"/> LOCAL FIRST <span>v0.1.0</span></div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">工作空間<Icon name="chevron" size={13}/><strong>{{ learn: '學習工作台', overview: '學習總覽', resources: '學習資源', settings: '環境與設定' }[page]}</strong></div><div className="topbar-right"><span className="save-state"><span className="status-dot"/>{window.studio ? saveState : '瀏覽器預覽 · 僅儲存草稿'}</span><span className="preview-badge">開源預覽版</span></div></header>

      {page === 'learn' && <main className="learning-page">
        <section className="workspace-toolbar" aria-label="學習工具列">
          <div className="workspace-title"><span className="chapter-label">{String(topics.findIndex(t => t.id === topic) + 1).padStart(2,'0')}</span><h1 title={topicInfo.description}>{topicInfo.name}<span className="heading-dot">.</span></h1></div>
          <div className="workspace-controls"><label htmlFor="language-select">語言</label><div className="language-select-wrap"><span className="language-monogram" aria-hidden="true" style={{ '--language-color': lang.color } as React.CSSProperties}>{lang.short}</span><select id="language-select" aria-label="程式語言" value={language} disabled={locked} onChange={e => setProgress(p => ({ ...p, selectedLanguage: e.target.value as LanguageId }))}>{languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select><Icon name="chevron" size={14}/></div><span className="compact-progress" title={lang.name + ' 學習進度'}>{currentLanguageDone} / {topics.length}</span><div className="view-switch" role="group" aria-label="工作區檢視">{([{ mode: 'split', label: '並排' }, { mode: 'lesson', label: '教材' }, { mode: 'code', label: '程式' }] as const).map(view => <button key={view.mode} aria-pressed={workspaceMode === view.mode} title={view.mode === 'split' ? '並排顯示教材與程式' : view.mode === 'lesson' ? '專注閱讀教材' : '專注撰寫程式'} onClick={() => setWorkspaceMode(view.mode)}>{view.label}</button>)}</div></div>
        </section>

        <div className={`workbench mode-${workspaceMode}`}>
          <section className="lesson-panel">
            <div className="panel-tabs" aria-label="教材頁籤"><button className={lessonTab === 'lesson' ? 'selected' : ''} onClick={() => setLessonTab('lesson')}><Icon name="book" size={16}/>概念教學</button><button className={lessonTab === 'compare' ? 'selected' : ''} onClick={() => setLessonTab('compare')}><Icon name="compare" size={16}/>語言比較<span className="count-badge">{languages.length}</span></button><button className={lessonTab === 'practice' ? 'selected' : ''} onClick={() => setLessonTab('practice')}><Icon name="flag" size={16}/>本題練習</button></div>
            <div className="lesson-scroll" ref={lessonScrollRef}>
              {lessonTab === 'lesson' && <>
                <div className="lesson-kicker"><span className="small-square"/>{lang.name.toUpperCase()} · {topicInfo.english.toUpperCase()}</div>
                <h2>{lesson.headline}</h2><p className="lesson-intro">{lesson.explanation}</p>
                <div className="concept-example"><div className="code-caption"><span>教學範例</span><span>{lang.name}</span></div><pre>{lesson.example}</pre></div>
                {lesson.sections?.map(section => <section className="teaching-section" key={section.title}><h3>{section.title}</h3><p>{section.body}</p></section>)}
                <div className="section-caption">記住這幾件事</div><ul className="key-points">{lesson.points.map((point, i) => <li key={point}><span>{i + 1}</span><p>{point}</p></li>)}</ul>
                <div className="insight-card"><Icon name="compare" size={18}/><div><strong>換個語言，換個角度</strong><p>{lesson.difference}</p></div></div>
                <div className="practice-invitation"><Icon name="flag" size={20}/><h3>讀完了，換你試試。</h3><p>本主題有一道獨立練習：{lesson.exerciseTitle}。</p><button className="primary-button" onClick={() => setLessonTab('practice')}>開始本題練習<Icon name="arrow" size={16}/></button></div>
              </>}
              {lessonTab === 'compare' && <><div className="lesson-kicker"><span className="small-square"/>SAME IDEA, DIFFERENT SYNTAX</div><h2>一個概念，不同表達</h2><p className="lesson-intro">比較寫法，也留意型別、可變性與求值方式。各語言的相近概念不一定是完全相同的機制。</p><div className="comparison-list">{languages.map(l => { const item = lessonFor(l.id, topic); return <article key={l.id}><div><span className="comparison-language">{l.name}</span><small>{l.paradigm}</small></div><pre>{item.example}</pre><p>{item.difference}</p></article>; })}</div></>}
              {lessonTab === 'practice' && <div className="practice-section"><div className="practice-heading"><span><Icon name="flag" size={17}/>本主題獨立練習</span><span className="level-tag">一題一概念</span></div><h2>{lesson.exerciseTitle}</h2><p>{lesson.task}</p><div className="io-example"><div><span>範例輸入</span><code>{lesson.tests[0].input || '（空行）'}</code></div><Icon name="arrow" size={17}/><div><span>預期輸出</span><code>{lesson.tests[0].expected || '（空行）'}</code></div></div><div className="exercise-footnote"><Icon name="shield" size={14}/>{lesson.tests.length} 組測試，包含邊界案例 · 接受不同的正確解法</div><button className="hint-button" onClick={() => setProgress(p => ({ ...p, hints: { ...p.hints, [key]: !p.hints[key] } }))}><Icon name="bulb" size={17}/>{progress.hints[key] ? '收起提示' : '需要一點提示？'}<Icon name="chevron" size={14}/></button>{progress.hints[key] && <div className="hint-content">{lesson.hint}</div>}<div className="practice-help"><h3>練習方式</h3><p>在右側編輯器完成程式。先用「執行程式」嘗試輸入，再「提交驗證」檢查全部案例。AI 回饋可進一步檢視本主題的解題方式。</p></div></div>}
              <button className="source-link" onClick={() => void open(lesson.source)}><Icon name="external" size={14}/>{lesson.sourceTitle}<span>教材依據</span></button>
            </div>
          </section>

          <section className="editor-panel" aria-label="程式編輯與驗證">
            <div className="editor-toolbar"><div className="file-tab"><span className="file-dot" style={{ background: lang.color }}/>{language === 'java' || language === 'haskell' ? 'Main' : 'main'}.{lang.extension}<span className="file-modified">{progress.drafts[key] !== undefined ? '•' : ''}</span></div><div className="editor-tools"><span>{lang.name}</span><button title="重設程式碼" aria-label="重設程式碼" disabled={locked} onClick={() => setModal('reset')}><Icon name="reset" size={16}/></button></div></div>
            <div className="code-editor"><Suspense fallback={<div className="editor-loading">正在開啟編輯器…</div>}><CodeEditor key={key} code={code} language={language} onChange={updateCode} onRun={() => void run()}/></Suspense></div>
            <div className="editor-status"><span><span className={`status-dot ${runtimes[language]?.available ? '' : 'muted'}`}/>{runtimes[language] ? runtimes[language]!.available ? '執行環境就緒' : '需安裝執行環境' : '偵測執行環境中'}</span><span>UTF-8 <span>·</span> {lang.name}</span></div>
            <div className="execution-bar"><button className="run-button" disabled={locked || !loaded} onClick={() => void run()}><Icon name="play" size={16}/>{busy ? '執行中…' : '執行程式'}<kbd>Ctrl ↵</kbd></button><button className="submit-button" disabled={locked || !loaded} onClick={() => void check()}><Icon name="check" size={17}/>提交驗證<Icon name="arrow" size={16}/></button></div>
            <div className={`results-panel ${resultsOpen ? '' : 'collapsed'}`}><div className="result-tabs"><button className={resultTab === 'output' ? 'selected' : ''} onClick={() => { setResultTab('output'); setResultsOpen(true); }}><Icon name="terminal" size={15}/>執行結果</button><button className={resultTab === 'tests' ? 'selected' : ''} onClick={() => { setResultTab('tests'); setResultsOpen(true); }}>測試案例{currentEvidence && <span className={currentEvidence.check.passed && !stale ? 'test-count passed' : 'test-count'}>{stale ? '待重測' : `${currentEvidence.check.results.filter(r => r.passed).length}/${lesson.tests.length}`}</span>}</button><button className={resultTab === 'ai' ? 'selected' : ''} onClick={() => { setResultTab('ai'); setResultsOpen(true); }}><Icon name="spark" size={15}/>AI 回饋</button><button className="result-collapse" aria-label={resultsOpen ? "收合結果區" : "展開結果區"} title={resultsOpen ? "收合結果區，增加程式空間" : "展開結果區"} aria-expanded={resultsOpen} aria-controls="result-content" onClick={() => setResultsOpen(open => !open)}><Icon name="chevron" size={14}/></button></div>
              <div className="result-body" id="result-content" hidden={!resultsOpen}>{error && <div className="error-banner" role="alert">{error}{error.includes('帳戶') && <button onClick={() => setPage('settings')}>前往設定 <Icon name="arrow" size={14}/></button>}</div>}
              {busy && <div className="running-message"><span className="spinner"/>正在編譯或執行程式，請稍候…</div>}
              {resultTab === 'output' && <><label className="stdin-label" htmlFor="stdin">標準輸入 <span>stdin</span></label><input id="stdin" className="stdin-input" value={stdin} onChange={e => setStdin(e.target.value)} placeholder="輸入測試資料，以空白分隔" disabled={busy}/>{output ? <div className="output-block"><div className="output-heading"><span>{output.exitCode === 0 && !output.timedOut ? '執行完成' : output.timedOut ? '執行逾時' : '執行失敗'}</span><small>{output.duration} ms</small></div>{output.stdout && <pre>{output.stdout}</pre>}{output.stderr && <pre className={output.exitCode === 0 ? 'runtime-warning' : 'stderr'}>{output.stderr}</pre>}{output.timedOut && <p className="stderr">程式超過時間限制，已停止。請檢查是否存在無限迴圈。</p>}{!output.stdout && !output.stderr && <p>程式沒有輸出。</p>}</div> : !busy && <div className="empty-output"><Icon name="terminal" size={23}/><div><strong>準備好，試著執行看看。</strong><p>完成右上方的程式，結果會出現在這裡。</p></div></div>}</>}
              {resultTab === 'tests' && <>{stale && <div className="stale-note">程式已修改。以下是上一版結果，請重新提交驗證。</div>}{currentEvidence ? <><div className={`test-summary ${currentEvidence.check.passed && !stale ? 'success' : ''}`}><Icon name={currentEvidence.check.passed && !stale ? 'check' : 'flag'} size={18}/>{currentEvidence.check.passed ? '所有案例通過' : '還差一點，再試一次'}<span>{currentEvidence.check.results.filter(r => r.passed).length} / {lesson.tests.length}</span></div>{lesson.tests.map((test, i) => { const result = currentEvidence.check.results[i]; return <details className={`test-row ${result?.passed ? 'pass' : ''}`} key={test.label}><summary><span className="test-state">{result?.passed ? <Icon name="check" size={14}/> : result ? '×' : '–'}</span><span>{test.label}</span><small>{result ? result.timedOut ? '逾時' : result.passed ? '通過' : result.exitCode !== 0 ? '程式錯誤' : '未通過' : '未執行'}</small><Icon name="chevron" size={12}/></summary><div className="test-detail"><p>輸入：<code>{test.input}</code></p><p>預期：<code>{test.expected}</code></p><p>實際：<code>{result?.stdout || '（無輸出）'}</code></p>{result?.stderr && <pre>{result.stderr}</pre>}</div></details>; })}</> : <><p className="muted-copy">提交後將實際執行以下案例。</p>{lesson.tests.map((t, i) => <div className="pending-test" key={t.label}><span>{String(i + 1).padStart(2, '0')}</span>{t.label}<small>等待提交</small></div>)}</>}</>}
              {resultTab === 'ai' && <div className="ai-content">{aiBusy ? <div className="running-message"><span className="spinner"/>AI 正在檢視你的解題思路…</div> : currentReview ? <>{currentReview.code !== code && <div className="stale-note">程式已修改，這是先前版本的 AI 回饋。</div>}<div className="ai-review">{currentReview.text}</div></> : <div className="ai-empty"><span className="ai-spark"><Icon name="spark" size={23}/></span><h3>多一個角度，理解你的程式。</h3><p>AI 會依題目、程式及測試結果，說明概念與下一步提示。評閱會送出這些內容，使用已連結帳戶的可用額度。</p></div>}<button className="ai-review-button" disabled={locked} onClick={() => void review()}><Icon name="spark" size={16}/>{currentReview ? '重新取得 AI 回饋' : '取得 AI 回饋'}<Icon name="arrow" size={15}/></button></div>}
              </div>
            </div>
            <div className="editor-footer"><span><Icon name="bulb" size={14}/>先動手，再慢慢修正。</span><button disabled={locked} onClick={() => setModal('solution')}>查看參考解答<Icon name="external" size={13}/></button></div>
          </section>
        </div>
      </main>}

      {page === 'overview' && <main className="secondary-page"><div className="eyebrow">YOUR LEARNING JOURNEY</div><h1>從一個概念，走向六種語言<span className="heading-dot">.</span></h1><p className="secondary-intro">先理解，再動手。用實際練習建立自己的程式思考方式。</p><div className="overview-banner"><div><span className="eyebrow">KEEP EXPLORING</span><h2>今天，也往前一小步。</h2><p>繼續學習 {lang.name} 的「{topicInfo.name}」。草稿已為你保留。</p><button className="primary-button" onClick={() => setPage('learn')}>繼續學習<Icon name="arrow" size={17}/></button></div><div className="overview-art" aria-hidden="true"><span>{'{'} <b>λ</b> {'}'}</span><small>ONE IDEA. SIX LANGUAGES.</small></div></div><div className="section-title"><h2>你的語言地圖</h2><span>{completedCount} / {totalExercises} 題練習完成</span></div><div className="language-cards">{languages.map(l => { const count = topics.filter(t => progress.completed.includes(`${l.id}:${t.id}`)).length; return <button className="language-card" key={l.id} disabled={locked} onClick={() => { setProgress(p => ({ ...p, selectedLanguage: l.id })); setPage('learn'); }}><span className="language-card-icon" style={{ background: l.color + '40', color: '#3e4d43' }}>{l.short}</span><h3>{l.name}</h3><p>{l.paradigm}</p><div className="light-progress"><span style={{ width: `${count / topics.length * 100}%` }}/></div><div className="language-card-bottom"><span>{count} / {topics.length} 題練習</span><Icon name="arrow" size={17}/></div></button>; })}</div><div className="overview-note"><Icon name="shield"/><p>完成狀態來自實際測試。歷史通關紀錄會保留；修改草稿後，可重新提交確認新版本。</p></div></main>}

      {page === 'resources' && <main className="secondary-page"><div className="eyebrow">GO TO THE SOURCE</div><h1>學習資源<span className="heading-dot">.</span></h1><p className="secondary-intro">教材以官方與原始文件查核概念，範例與練習為本專案自行編寫。遇到疑問，回到來源多看一步。</p><div className="resource-grid">{languages.map(l => { const item = lessonFor(l.id, 'bindings'); return <article className="resource-card" key={l.id}><div className="resource-top"><span className="language-card-icon" style={{ background: l.color + '40' }}>{l.short}</span><span>官方／原始文件</span></div><h2>{l.name}</h2><p>{item.sourceTitle}</p><p className="resource-note">對照概念、查閱語法，並進一步探索語言的設計。</p><button className="text-button" onClick={() => void open(item.source)}>閱讀文件<Icon name="external" size={15}/></button></article>; })}</div><div className="sources-note"><h3>關於這份教材</h3><p>目前提供 {topics.length} 個主題，每語言每主題各一題，共 {totalExercises} 題獨立練習。教材採本機隨附，閱讀與練習不需連網；AI 評閱及外部文件需要網路。</p><p>內容基準：Python 3.10+、Node.js、C#／.NET 6+、Rust 2024 edition、Java 17+、Haskell／GHC 9.x。此版以本機可用執行環境驗證，完整驗證紀錄請見專案 VERIFICATION.md。</p></div></main>}

      {page === 'settings' && <main className="secondary-page settings-page"><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>環境與設定<span className="heading-dot">.</span></h1><p className="secondary-intro">管理語言執行環境、ChatGPT 連線與本機學習資料。</p><section className="settings-card"><div className="settings-section-heading"><div><Icon name="spark"/><h2>ChatGPT 帳戶</h2></div><span className={`connection-badge ${auth.loggedIn ? 'connected' : ''}`}>{auth.loggedIn ? '已連結' : '尚未連結'}</span></div><p>透過官方 Codex 登入流程連結 ChatGPT，在本機開源 App 中取得 AI 教學回饋。需要可用的方案權限與額度。此版登入與既有 Codex 工作資料分開保存。</p><div className="account-state"><Icon name="shield" size={18}/><span>{authBusy ? '正在檢查帳戶…' : auth.message}{auth.plan ? ` · ${auth.plan}` : ''}</span></div><div className="settings-actions"><button className="primary-button" disabled={authBusy || auth.loggedIn || !window.studio} onClick={async () => { if (!window.studio) return; setAuthBusy(true); try { setAuth(await window.studio.login()); } catch (e) { setToast(errorText(e)); } finally { setAuthBusy(false); } }}><Icon name="link" size={16}/>{auth.loggedIn ? '帳戶已連結' : '連結 ChatGPT'}</button>{auth.loggedIn && <button className="secondary-button" disabled={authBusy || !window.studio} onClick={async () => { if (!window.studio) return; setAuthBusy(true); try { setAuth(await window.studio.logout()); } catch (e) { setToast(errorText(e)); } finally { setAuthBusy(false); } }}>解除連結</button>}<button className="secondary-button" disabled={authBusy || !window.studio} onClick={() => void refreshAuth()}><Icon name="reset" size={15}/>重新整理</button></div><small className="setting-caption">完成瀏覽器登入後，按重新整理確認。尚未安裝 Codex 時，請先安裝官方 Codex CLI 或官方 VS Code 擴充套件。</small></section><section className="settings-card"><div className="settings-section-heading"><div><Icon name="terminal"/><h2>語言執行環境</h2></div><button className="text-button" disabled={environmentBusy || locked || !window.studio} onClick={() => void refreshEnvironment()}><Icon name="reset" size={14}/>{environmentBusy ? '偵測中…' : '重新偵測'}</button></div><p>JavaScript 執行環境已隨 App 提供；其他語言使用電腦已安裝並可找到的工具鏈。安裝後重新開啟 App，再進行偵測。</p><div className="runtime-list">{languages.map(l => <div className="runtime-row" key={l.id}><span className="runtime-symbol" style={{ background: l.color + '40' }}>{l.short}</span><div><strong>{l.name}</strong><small>{runtimes[l.id]?.version || (window.studio ? '尚在偵測' : '桌面版可偵測')}</small></div><span className={`runtime-badge ${runtimes[l.id]?.available ? 'ready' : ''}`}>{runtimes[l.id]?.available ? '可使用' : '待安裝'}</span><button title={`${l.name} 安裝指引`} aria-label={`${l.name} 安裝指引`} onClick={() => void open(l.install)}><Icon name="external" size={16}/></button></div>)}</div><div className="execution-note"><Icon name="shield" size={18}/><p>本機練習會以目前 Windows 帳戶權限執行。此版有逾時與輸出限制，尚未提供作業系統沙箱；請只執行自己撰寫或信任的程式。</p></div></section><section className="settings-card"><div className="settings-section-heading"><div><Icon name="box"/><h2>資料與版本</h2></div><span className="version-label">0.1.0 · Review Preview</span></div><p>桌面版的進度與草稿儲存在本機 SQLite。AI 回饋暫存於本次工作階段；送交評閱前，請確認程式中沒有私人資料。</p><div className="data-info"><span>學習挑戰</span><strong>{completedCount} / {totalExercises} 已完成</strong><span>儲存狀態</span><strong>{saveState}</strong><span>開源授權</span><strong>MIT</strong></div></section></main>}
    </div>

    {toast && <div className="toast" role="status"><Icon name="check" size={18}/>{toast}<button onClick={() => setToast('')} aria-label="關閉通知"><Icon name="close" size={16}/></button></div>}
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="關閉對話框"><Icon name="close"/></button><span className="eyebrow">{lang.name.toUpperCase()} · {topicInfo.english.toUpperCase()}</span><h2 id="modal-title">{modal === 'reset' ? '重新開始這個練習？' : '參考解答，一種可能的寫法。'}</h2>{modal === 'reset' ? <><p>這會將目前語言、本節的草稿恢復為起始程式。其他語言草稿與通關紀錄會保留。</p><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>保留草稿</button><button className="primary-button" onClick={() => { updateCode(lesson.starter); setModal(null); setOutput(null); }}>重設程式碼</button></div></> : <><p>先比較思路與差異，再試著用自己的方式完成。這份解答可以載入編輯器實際驗證。</p><pre className="solution-code">{lesson.solution}</pre><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>回去自己試試</button><button className="primary-button" onClick={() => { updateCode(lesson.solution); setModal(null); setToast('已載入參考解答，按「提交驗證」實際執行測試。'); }}>載入編輯器<Icon name="arrow" size={16}/></button></div></>}</section></div>}
  </div>;
}
