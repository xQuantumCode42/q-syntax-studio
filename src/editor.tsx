import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import type { LanguageId } from './types';
import { useCallback, useRef } from 'react';

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};
loader.config({ monaco });
if (!monaco.languages.getLanguages().some(l => l.id === 'haskell')) {
  monaco.languages.register({ id: 'haskell' });
  monaco.languages.setMonarchTokensProvider('haskell', { tokenizer: { root: [
    [/--.*$/, 'comment'], [/\b(let|in|where|if|then|else|do|case|of|data|type|module|import|deriving)\b/, 'keyword'],
    [/\b(Int|Integer|String|Bool|IO|True|False|Double)\b/, 'type'], [/"([^"\\]|\\.)*"/, 'string'], [/\b\d+\b/, 'number'], [/[=<>:+*|\-]+/, 'operator'],
  ] } });
}
monaco.editor.defineTheme('studio', { base: 'vs-dark', inherit: true, rules: [
  { token: 'comment', foreground: '788b8b' }, { token: 'keyword', foreground: 'c6b4fb' },
  { token: 'string', foreground: 'b0d7a6' }, { token: 'number', foreground: 'f3c58b' },
], colors: { 'editor.background': '#192b2e', 'editor.foreground': '#dde8e3', 'editorLineNumber.foreground': '#607579', 'editorLineNumber.activeForeground': '#c3d4cd', 'editor.lineHighlightBackground': '#203438', 'editor.selectionBackground': '#34514d', 'editorCursor.foreground': '#bce4ba', 'editorIndentGuide.background1': '#2c4143' } });

export default function CodeEditor({ code, language, onChange, onRun }: { code: string; language: LanguageId; onChange: (s: string) => void; onRun: () => void }) {
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const handleChange = useCallback((value: string | undefined) => changeRef.current(value ?? ''), []);
  return <Editor height="100%" language={language} value={code} theme="studio" onChange={handleChange}
    loading={<div className="editor-loading">正在開啟編輯器…</div>}
    onMount={editor => {
      editor.addAction({ id: 'run', label: '執行程式', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter], run: () => runRef.current() });
      const frame = requestAnimationFrame(() => editor.getDomNode()?.setAttribute('data-ready-language', language));
      editor.onDidDispose(() => cancelAnimationFrame(frame));
    }}
    options={{ fontSize: 14, fontFamily: "'Cascadia Code', Consolas, monospace", lineHeight: 22, minimap: { enabled: false }, padding: { top: 22, bottom: 20 }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4, wordWrap: 'on', renderLineHighlight: 'line', bracketPairColorization: { enabled: true }, overviewRulerLanes: 0, hideCursorInOverviewRuler: true, scrollbar: { verticalScrollbarSize: 7, horizontalScrollbarSize: 7 }, quickSuggestions: false, stickyScroll: { enabled: false } }} />;
}
