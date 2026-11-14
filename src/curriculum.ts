import type { LanguageId, Lesson, Progress, TopicId } from './types';
import { languages } from './languages';
import foundation from './foundation.json';
import { buildProgram } from './programs';
import { specs, type ExpandedId, type FoundationId } from './topic-specs';
export { languages } from './languages';

export const topicGroups = [
  { id: 'basics', name: '入門與控制流程' },
  { id: 'data', name: '資料與轉換' },
  { id: 'structure', name: '程式結構與型別' },
  { id: 'advanced', name: '可靠性與進階概念' },
] as const;
type Group = typeof topicGroups[number]['id'];
export const topics: { id: TopicId; name: string; english: string; description: string; icon: string; group: Group }[] = [
  { id: 'bindings', name: '資料與綁定', english: 'Values & bindings', description: '認識型別、名稱與資料綁定。', icon: 'box', group: 'basics' },
  { id: 'operators', name: '運算子與數值', english: 'Operators & numbers', description: '理解整數除法、餘數與運算順序。', icon: 'function', group: 'basics' },
  { id: 'branches', name: '條件與分支', english: 'Conditions & branches', description: '根據不同情況，選擇不同路徑。', icon: 'branch', group: 'basics' },
  { id: 'loops', name: '迴圈與重複運算', english: 'Loops & repetition', description: '從迴圈到折疊，描述重複的工作。', icon: 'reset', group: 'basics' },
  { id: 'functions', name: '函式與參數', english: 'Functions & parameters', description: '用參數與回傳值拆解運算。', icon: 'function', group: 'basics' },
  { id: 'strings', name: '字串與文字處理', english: 'Strings & text', description: '操作文字，理解字元、大小寫與編碼。', icon: 'code', group: 'data' },
  { id: 'collections', name: '陣列與清單', english: 'Arrays & lists', description: '儲存、走訪並篩選一組資料。', icon: 'layers', group: 'data' },
  { id: 'maps', name: '字典與鍵值映射', english: 'Maps & dictionaries', description: '用鍵尋找值，建立次數統計。', icon: 'grid', group: 'data' },
  { id: 'sets', name: '集合與去重', english: 'Sets & uniqueness', description: '用唯一性表達資料集合。', icon: 'layers', group: 'data' },
  { id: 'higherorder', name: '高階函式與閉包', english: 'Higher-order functions', description: '把函式當作值，組合資料轉換。', icon: 'function', group: 'data' },
  { id: 'recursion', name: '遞迴與終止條件', english: 'Recursion & base cases', description: '把問題縮小，直到能直接求解。', icon: 'reset', group: 'structure' },
  { id: 'records', name: '物件與自訂型別', english: 'Objects & data types', description: '用類別、結構與資料型別表達領域概念。', icon: 'box', group: 'structure' },
  { id: 'polymorphism', name: '介面、Trait 與多型', english: 'Interfaces & polymorphism', description: '讓不同型別提供一致的行為。', icon: 'compare', group: 'structure' },
  { id: 'generics', name: '泛型與型別參數', english: 'Generics & type parameters', description: '寫出可重用於多種型別的運算。', icon: 'code', group: 'structure' },
  { id: 'modules', name: '模組與命名空間', english: 'Modules & namespaces', description: '組織程式、引用函式庫並管理可見性。', icon: 'book', group: 'structure' },
  { id: 'ownership', name: '可變性、複製與共享', english: 'Ownership & sharing', description: '比較參考、複製、借用與不可變資料。', icon: 'compare', group: 'advanced' },
  { id: 'matching', name: '模式匹配與列舉分支', english: 'Patterns & case analysis', description: '列出資料的可能情況，完整處理分支。', icon: 'branch', group: 'advanced' },
  { id: 'errors', name: '錯誤處理與安全轉型', english: 'Errors & safe parsing', description: '把可能失敗的輸入，變成可處理的結果。', icon: 'shield', group: 'advanced' },
  { id: 'files', name: '檔案與輸入輸出', english: 'Files & I/O', description: '寫入、讀取並正確釋放檔案資源。', icon: 'book', group: 'advanced' },
  { id: 'concurrency', name: '並行工作與等待結果', english: 'Concurrency & results', description: '啟動工作、傳遞結果，理解並行與非同步。', icon: 'layers', group: 'advanced' },
  { id: 'testing', name: '斷言與單元測試入門', english: 'Assertions & testing', description: '把預期行為寫成可以重複執行的檢查。', icon: 'check', group: 'advanced' },
];
export const totalExercises = topics.length * languages.length;

const titles: Record<FoundationId, string> = { bindings: '把兩個數字加起來', branches: '幫售票員算出票價', functions: '打造你的平方函式', collections: '找出清單中的正數總和' };
const sections: Record<FoundationId, { title: string; body: string }[]> = {
  bindings: [{ title: '從名稱到型別', body: '名稱讓你重複使用同一個值；型別決定可進行的操作。把輸入、轉型、計算與輸出分開思考，更容易找出錯誤。' }, { title: '避免文字與數字混淆', body: '終端輸入通常是文字。先確認轉型，再進行數值運算，避免把文字串接誤認為加法。' }],
  branches: [{ title: '先把規則畫成區間', body: '多個條件是否互斥、是否遺漏？先列出每個區間，再按照順序寫進程式。' }, { title: '測試分界兩側', body: '對每個門檻，檢查門檻前、剛好門檻與門檻後的值。能執行不代表規則正確。' }],
  functions: [{ title: '參數是輸入，回傳值是結果', body: '把計算放在函式，讓呼叫端讀取與顯示資料。這種分工讓同一份計算能在其他流程及測試重用。' }, { title: '回傳與列印不同', body: '列印會改變外部輸出；回傳把值交給呼叫端繼續計算。先確認題目需要哪一種行為。' }],
  collections: [{ title: '先選擇合適容器', body: '陣列、動態陣列與串列的存取成本、可變性不同。本節先聚焦走訪與篩選，後續再比較集合、字典與高階函式。' }, { title: '空結果也要定義', body: '即使輸入有元素，篩選後仍可能一個也不剩。加總的初始值 0，能讓這種情況自然得到合理結果。' }],
};

export function lessonFor(language: LanguageId, topic: TopicId): Lesson {
  const base = (foundation[language] as Partial<Record<TopicId, Omit<Lesson, 'exerciseTitle'>>>)[topic];
  if (base) return { ...base, exerciseTitle: titles[topic as FoundationId], sections: sections[topic as FoundationId] };
  const spec = specs[topic as ExpandedId];
  const reference = foundation[language].bindings;
  let source = reference.source, sourceTitle = reference.sourceTitle;
  if (language === 'javascript' && ['files', 'concurrency', 'testing', 'modules'].includes(topic)) {
    source = `https://nodejs.org/api/${({ files: 'fs', concurrency: 'worker_threads', testing: 'assert', modules: 'modules' } as Record<string,string>)[topic]}.html`;
    sourceTitle = 'Node.js 官方 API 文件';
  }
  if (language === 'haskell' && ['files', 'concurrency', 'testing'].includes(topic)) {
    source = `https://hackage.haskell.org/package/base/docs/${({ files: 'System-IO', concurrency: 'Control-Concurrent', testing: 'Control-Exception' } as Record<string,string>)[topic]}.html`;
    sourceTitle = 'Haskell base 函式庫文件';
  }
  return {
    headline: spec.headline, explanation: spec.explanation,
    sections: [{ title: '什麼時候使用', body: spec.use }, { title: '容易忽略的地方', body: spec.pitfall }],
    points: [spec.notes[language], ...spec.points], difference: spec.notes[language],
    example: buildProgram(language, topic, true, spec.tests[0].input),
    starter: buildProgram(language, topic, false), solution: buildProgram(language, topic, true),
    exerciseTitle: spec.exerciseTitle, task: spec.task, hint: spec.hint, tests: spec.tests, source, sourceTitle,
  };
}

export function migrateProgress(saved: unknown): Progress | null {
  if (!saved || typeof saved !== 'object') return null;
  const value = saved as Progress;
  if (!languages.some(l => l.id === value.selectedLanguage) || !value.drafts || !Array.isArray(value.completed)) return null;
  // Retain archived removed-topic data, but do not display or count it.
  return { ...value, hints: value.hints || {}, selectedTopic: topics.some(t => t.id === value.selectedTopic) ? value.selectedTopic : 'bindings' };
}
