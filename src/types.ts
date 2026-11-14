export type LanguageId = 'python' | 'javascript' | 'csharp' | 'rust' | 'java' | 'haskell';
export type TopicId = 'bindings' | 'operators' | 'branches' | 'loops' | 'functions' | 'strings' | 'collections' | 'maps' | 'sets' | 'higherorder' | 'recursion' | 'records' | 'polymorphism' | 'generics' | 'modules' | 'ownership' | 'matching' | 'errors' | 'files' | 'concurrency' | 'testing';
export interface TestCase { input: string; expected: string; label: string }
export interface Lesson {
  exerciseTitle: string;
  sections?: { title: string; body: string }[];
  headline: string;
  explanation: string;
  points: string[];
  example: string;
  starter: string;
  solution: string;
  hint: string;
  source: string;
  sourceTitle: string;
  difference: string;
  task: string;
  tests: TestCase[];
}
export interface Runtime { available: boolean; version: string; command?: string }
export interface RunResult { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; duration: number }
export interface CheckResult { passed: boolean; results: (RunResult & { label: string; expected: string; input: string; passed: boolean })[] }
export interface Progress { drafts: Record<string, string>; completed: string[]; hints: Record<string, boolean>; selectedLanguage: LanguageId; selectedTopic: TopicId }
export interface AuthState { available: boolean; loggedIn: boolean; message: string; plan?: string }
export interface DesktopBridge {
  runtimes(): Promise<Record<LanguageId, Runtime>>;
  run(input: { language: LanguageId; code: string; stdin: string }): Promise<RunResult>;
  check(input: { language: LanguageId; code: string; tests: TestCase[] }): Promise<CheckResult>;
  load(): Promise<Progress | null>;
  save(progress: Progress): Promise<void>;
  openExternal(url: string): Promise<void>;
  authStatus(): Promise<AuthState>;
  login(): Promise<AuthState>;
  logout(): Promise<AuthState>;
  onClosing(callback: () => Promise<void>): () => void;
  review(input: { language: string; topic: string; task: string; code: string; results: string }): Promise<string>;
}
declare global { interface Window { studio?: DesktopBridge } }
