import type { LanguageId } from './types';

export const languages: { id: LanguageId; name: string; short: string; color: string; extension: string; paradigm: string; install: string }[] = [
  { id: 'python', name: 'Python', short: 'Py', color: '#e8c56b', extension: 'py', paradigm: '簡潔 · 動態型別', install: 'https://www.python.org/downloads/windows/' },
  { id: 'javascript', name: 'JavaScript', short: 'JS', color: '#e6cf69', extension: 'js', paradigm: '靈活 · 多範式', install: 'https://nodejs.org/en/download' },
  { id: 'csharp', name: 'C#', short: 'C#', color: '#b8a1df', extension: 'cs', paradigm: '靜態型別 · .NET', install: 'https://dotnet.microsoft.com/download' },
  { id: 'rust', name: 'Rust', short: 'Rs', color: '#dca082', extension: 'rs', paradigm: '安全 · 所有權', install: 'https://www.rust-lang.org/tools/install' },
  { id: 'java', name: 'Java', short: 'Jv', color: '#dfac70', extension: 'java', paradigm: '靜態型別 · JVM', install: 'https://dev.java/learn/getting-started/' },
  { id: 'haskell', name: 'Haskell', short: 'λ', color: '#b2a2da', extension: 'hs', paradigm: '純函式 · 惰性求值', install: 'https://www.haskell.org/ghcup/' },
];

