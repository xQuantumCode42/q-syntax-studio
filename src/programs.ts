import type { LanguageId, TopicId } from './types';

interface Snippet { body: string; declarations?: string }
const s = (body: string, declarations = ''): Snippet => ({ body, declarations });
const snippets: Partial<Record<TopicId, Record<LanguageId, Snippet>>> = {
  operators: {
    python: s('a, b = values\nquotient, remainder = divmod(a, b)\nprint(quotient, remainder)'),
    javascript: s('const [a, b] = values;\nconsole.log(Math.trunc(a / b), a % b);'),
    csharp: s('int a = values[0], b = values[1];\nConsole.WriteLine($"{a / b} {a % b}");'),
    rust: s('let (a, b) = (values[0], values[1]);\nprintln!("{} {}", a / b, a % b);'),
    java: s('int a = values[0], b = values[1];\nSystem.out.println((a / b) + " " + (a % b));'),
    haskell: s('let (q, r) = divMod (values !! 0) (values !! 1)\nputStrLn (show q ++ " " ++ show r)'),
  },
  loops: {
    python: s('total = 0\nfor n in range(1, values[0] + 1):\n    total += n\nprint(total)'),
    javascript: s('let total = 0;\nfor (let n = 1; n <= values[0]; n++) {\n  total += n;\n}\nconsole.log(total);'),
    csharp: s('int total = 0;\nfor (int n = 1; n <= values[0]; n++)\n{\n    total += n;\n}\nConsole.WriteLine(total);'),
    rust: s('let mut total = 0;\nfor n in 1..=values[0] {\n    total += n;\n}\nprintln!("{}", total);'),
    java: s('int total = 0;\nfor (int n = 1; n <= values[0]; n++) {\n    total += n;\n}\nSystem.out.println(total);'),
    haskell: s('let numbers = [1 .. head values]\nprint (foldl (+) 0 numbers)'),
  },
  strings: {
    python: s('print(text.upper())'),
    javascript: s('console.log(text.toUpperCase());'),
    csharp: s('Console.WriteLine(text.ToUpperInvariant());'),
    rust: s('println!("{}", text.to_ascii_uppercase());'),
    java: s('System.out.println(text.toUpperCase(Locale.ROOT));'),
    haskell: s('putStrLn (map toUpper text)'),
  },
  maps: {
    python: s('counts = {}\nfor n in values[1:]:\n    counts[n] = counts.get(n, 0) + 1\nprint(counts.get(values[0], 0))'),
    javascript: s('const counts = new Map();\nfor (const n of values.slice(1)) {\n  counts.set(n, (counts.get(n) ?? 0) + 1);\n}\nconsole.log(counts.get(values[0]) ?? 0);'),
    csharp: s('var counts = new Dictionary<int, int>();\nforeach (int n in values.Skip(1))\n{\n    counts.TryGetValue(n, out int count);\n    counts[n] = count + 1;\n}\nConsole.WriteLine(counts.GetValueOrDefault(values[0], 0));'),
    rust: s('let mut counts = std::collections::HashMap::new();\nfor &n in &values[1..] {\n    *counts.entry(n).or_insert(0) += 1;\n}\nprintln!("{}", counts.get(&values[0]).unwrap_or(&0));'),
    java: s('Map<Integer, Integer> counts = new HashMap<>();\nfor (int i = 1; i < values.length; i++) {\n    counts.merge(values[i], 1, Integer::sum);\n}\nSystem.out.println(counts.getOrDefault(values[0], 0));'),
    haskell: s('let counts = Map.fromListWith (+) [(n, 1 :: Int) | n <- tail values]\nprint (Map.findWithDefault 0 (head values) counts)'),
  },
  sets: {
    python: s('unique = set(values)\nprint(len(unique))'),
    javascript: s('const unique = new Set(values);\nconsole.log(unique.size);'),
    csharp: s('var unique = new HashSet<int>(values);\nConsole.WriteLine(unique.Count);'),
    rust: s('let unique: std::collections::HashSet<i32> = values.into_iter().collect();\nprintln!("{}", unique.len());'),
    java: s('Set<Integer> unique = new HashSet<>();\nfor (int n : values) unique.add(n);\nSystem.out.println(unique.size());'),
    haskell: s('let unique = Set.fromList values\nprint (Set.size unique)'),
  },
  higherorder: {
    python: s('squares = map(lambda n: n * n, values)\neven_squares = filter(lambda n: n % 2 == 0, squares)\nprint(sum(even_squares))'),
    javascript: s('const total = values.map(n => n * n)\n  .filter(n => n % 2 === 0)\n  .reduce((sum, n) => sum + n, 0);\nconsole.log(total);'),
    csharp: s('int total = values.Select(n => n * n)\n    .Where(n => n % 2 == 0).Sum();\nConsole.WriteLine(total);'),
    rust: s('let total: i32 = values.iter().map(|n| n * n)\n    .filter(|&n| n % 2 == 0).sum();\nprintln!("{}", total);'),
    java: s('int total = Arrays.stream(values).map(n -> n * n)\n    .filter(n -> n % 2 == 0).sum();\nSystem.out.println(total);'),
    haskell: s('let total = sum (filter even (map (\\n -> n * n) values))\nprint total'),
  },
  recursion: {
    python: s('print(factorial(values[0]))', 'def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)'),
    javascript: s('console.log(factorial(values[0]));', 'function factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}'),
    csharp: s('Console.WriteLine(Factorial(values[0]));', 'static int Factorial(int n)\n{\n    return n <= 1 ? 1 : n * Factorial(n - 1);\n}'),
    rust: s('println!("{}", factorial(values[0]));', 'fn factorial(n: i32) -> i32 {\n    if n <= 1 { 1 } else { n * factorial(n - 1) }\n}'),
    java: s('System.out.println(factorial(values[0]));', 'static int factorial(int n) {\n    return n <= 1 ? 1 : n * factorial(n - 1);\n}'),
    haskell: s('print (factorial (head values))', 'factorial :: Int -> Int\nfactorial 0 = 1\nfactorial n = n * factorial (n - 1)'),
  },
  records: {
    python: s('rectangle = Rectangle(values[0], values[1])\nprint(rectangle.area())', 'class Rectangle:\n    def __init__(self, width, height):\n        self.width = width\n        self.height = height\n\n    def area(self):\n        return self.width * self.height'),
    javascript: s('const rectangle = new Rectangle(values[0], values[1]);\nconsole.log(rectangle.area());', 'class Rectangle {\n  constructor(width, height) {\n    this.width = width;\n    this.height = height;\n  }\n  area() { return this.width * this.height; }\n}'),
    csharp: s('var rectangle = new Rectangle(values[0], values[1]);\nConsole.WriteLine(rectangle.Area());', 'record Rectangle(int Width, int Height)\n{\n    public int Area() => Width * Height;\n}'),
    rust: s('let rectangle = Rectangle { width: values[0], height: values[1] };\nprintln!("{}", rectangle.area());', 'struct Rectangle { width: i32, height: i32 }\nimpl Rectangle {\n    fn area(&self) -> i32 { self.width * self.height }\n}'),
    java: s('Rectangle rectangle = new Rectangle(values[0], values[1]);\nSystem.out.println(rectangle.area());', 'record Rectangle(int width, int height) {\n    int area() { return width * height; }\n}'),
    haskell: s('let rectangle = Rectangle (values !! 0) (values !! 1)\nprint (area rectangle)', 'data Rectangle = Rectangle { width :: Int, height :: Int }\narea :: Rectangle -> Int\narea rectangle = width rectangle * height rectangle'),
  },
  polymorphism: {
    python: s('items = [DoubleScore(values[0]), TripleScore(values[0])]\nprint(sum(item.score() for item in items))', 'class DoubleScore:\n    def __init__(self, n): self.n = n\n    def score(self): return self.n * 2\n\nclass TripleScore:\n    def __init__(self, n): self.n = n\n    def score(self): return self.n * 3'),
    javascript: s('const items = [new DoubleScore(values[0]), new TripleScore(values[0])];\nconsole.log(items.reduce((sum, item) => sum + item.score(), 0));', 'class DoubleScore {\n  constructor(n) { this.n = n; }\n  score() { return this.n * 2; }\n}\nclass TripleScore {\n  constructor(n) { this.n = n; }\n  score() { return this.n * 3; }\n}'),
    csharp: s('IScored[] items = { new DoubleScore(values[0]), new TripleScore(values[0]) };\nConsole.WriteLine(items.Sum(item => item.Score()));', 'interface IScored { int Score(); }\nrecord DoubleScore(int N) : IScored { public int Score() => N * 2; }\nrecord TripleScore(int N) : IScored { public int Score() => N * 3; }'),
    rust: s('let a = DoubleScore(values[0]);\nlet b = TripleScore(values[0]);\nlet items: [&dyn Scored; 2] = [&a, &b];\nprintln!("{}", items.iter().map(|item| item.score()).sum::<i32>());', 'trait Scored { fn score(&self) -> i32; }\nstruct DoubleScore(i32);\nstruct TripleScore(i32);\nimpl Scored for DoubleScore { fn score(&self) -> i32 { self.0 * 2 } }\nimpl Scored for TripleScore { fn score(&self) -> i32 { self.0 * 3 } }'),
    java: s('Scored[] items = { new DoubleScore(values[0]), new TripleScore(values[0]) };\nint total = 0;\nfor (Scored item : items) total += item.score();\nSystem.out.println(total);', 'interface Scored { int score(); }\nrecord DoubleScore(int n) implements Scored { public int score() { return n * 2; } }\nrecord TripleScore(int n) implements Scored { public int score() { return n * 3; } }'),
    haskell: s('let n = head values\nprint (score (DoubleScore n) + score (TripleScore n))', 'class Scored a where\n    score :: a -> Int\nnewtype DoubleScore = DoubleScore Int\nnewtype TripleScore = TripleScore Int\ninstance Scored DoubleScore where\n    score (DoubleScore n) = n * 2\ninstance Scored TripleScore where\n    score (TripleScore n) = n * 3'),
  },
  generics: {
    python: s('assert first_or(["hello"], "empty") == "hello"\nprint(first_or(values, -1))', 'from typing import TypeVar, Sequence\nT = TypeVar("T")\ndef first_or(items: Sequence[T], fallback: T) -> T:\n    return items[0] if items else fallback'),
    javascript: s('const word = firstOr(["hello"], "empty");\nconsole.log(firstOr(values, -1));', '/** @template T\n * @param {T[]} items\n * @param {T} fallback\n * @returns {T} */\nfunction firstOr(items, fallback) {\n  return items.length === 0 ? fallback : items[0];\n}'),
    csharp: s('string word = FirstOr(new[] { "hello" }, "empty");\nConsole.WriteLine(FirstOr(values, -1));', 'static T FirstOr<T>(IReadOnlyList<T> items, T fallback)\n{\n    return items.Count == 0 ? fallback : items[0];\n}'),
    rust: s('let _word = first_or(&[String::from("hello")], String::from("empty"));\nprintln!("{}", first_or(&values, -1));', 'fn first_or<T: Clone>(items: &[T], fallback: T) -> T {\n    items.first().cloned().unwrap_or(fallback)\n}'),
    java: s('String word = firstOr(List.of("hello"), "empty");\nList<Integer> numbers = Arrays.stream(values).boxed().toList();\nSystem.out.println(firstOr(numbers, -1));', 'static <T> T firstOr(List<T> items, T fallback) {\n    return items.isEmpty() ? fallback : items.get(0);\n}'),
    haskell: s('let word = firstOr ["hello"] "empty"\nprint (firstOr values (-1))', 'firstOr :: [a] -> a -> a\nfirstOr [] fallback = fallback\nfirstOr (x:_) _ = x'),
  },
  modules: {
    python: s('import math\nprint(math.gcd(values[0], values[1]))'),
    javascript: s('console.log(arithmetic.gcd(values[0], values[1]));', 'const arithmetic = {\n  gcd(a, b) {\n    while (b !== 0) [a, b] = [b, a % b];\n    return a;\n  }\n};'),
    csharp: s('Console.WriteLine(Arithmetic.Gcd(values[0], values[1]));', 'static class Arithmetic\n{\n    public static int Gcd(int a, int b)\n    {\n        while (b != 0) (a, b) = (b, a % b);\n        return a;\n    }\n}'),
    rust: s('println!("{}", arithmetic::gcd(values[0], values[1]));', 'mod arithmetic {\n    pub fn gcd(mut a: i32, mut b: i32) -> i32 {\n        while b != 0 { (a, b) = (b, a % b); }\n        a\n    }\n}'),
    java: s('BigInteger a = BigInteger.valueOf(values[0]);\nBigInteger b = BigInteger.valueOf(values[1]);\nSystem.out.println(a.gcd(b));'),
    haskell: s('print (Prelude.gcd (values !! 0) (values !! 1))'),
  },
  ownership: {
    python: s('original = [values[0]]\nedited = original.copy()\nedited[0] += 1\nprint(original[0], edited[0])'),
    javascript: s('const original = [values[0]];\nconst edited = [...original];\nedited[0] += 1;\nconsole.log(original[0], edited[0]);'),
    csharp: s('int[] original = { values[0] };\nint[] edited = (int[])original.Clone();\nedited[0] += 1;\nConsole.WriteLine($"{original[0]} {edited[0]}");'),
    rust: s('let original = vec![values[0]];\nlet borrowed = &original;\nlet mut edited = original.clone();\nedited[0] += 1;\nprintln!("{} {}", borrowed[0], edited[0]);'),
    java: s('int[] original = { values[0] };\nint[] edited = original.clone();\nedited[0] += 1;\nSystem.out.println(original[0] + " " + edited[0]);'),
    haskell: s('let original = [head values]\n    edited = map (+ 1) original\nputStrLn (show (head original) ++ " " ++ show (head edited))'),
  },
  matching: {
    python: s('match values[0]:\n    case 1 | 2 | 3 | 4 | 5:\n        print("WORKDAY")\n    case 6 | 7:\n        print("WEEKEND")\n    case _:\n        print("INVALID")'),
    javascript: s('switch (values[0]) {\n  case 1: case 2: case 3: case 4: case 5:\n    console.log("WORKDAY"); break;\n  case 6: case 7:\n    console.log("WEEKEND"); break;\n  default: console.log("INVALID");\n}'),
    csharp: s('string result = values[0] switch\n{\n    >= 1 and <= 5 => "WORKDAY",\n    6 or 7 => "WEEKEND",\n    _ => "INVALID"\n};\nConsole.WriteLine(result);'),
    rust: s('let result = match values[0] {\n    1..=5 => "WORKDAY",\n    6 | 7 => "WEEKEND",\n    _ => "INVALID",\n};\nprintln!("{}", result);'),
    java: s('String result = switch (values[0]) {\n    case 1, 2, 3, 4, 5 -> "WORKDAY";\n    case 6, 7 -> "WEEKEND";\n    default -> "INVALID";\n};\nSystem.out.println(result);'),
    haskell: s('let result = case head values of\n        6 -> "WEEKEND"\n        7 -> "WEEKEND"\n        n | n >= 1 && n <= 5 -> "WORKDAY"\n        _ -> "INVALID"\nputStrLn result'),
  },
  errors: {
    python: s('import re\ntry:\n    if not re.fullmatch(r"[+-]?[0-9]+", text):\n        raise ValueError("Invalid integer format")\n    n = int(text)\n    print(n * 2 if -1000 <= n <= 1000 else "INVALID")\nexcept ValueError:\n    print("INVALID")'),
    javascript: s('const n = Number(text);\nif (/^[+-]?[0-9]+$/.test(text) && n >= -1000 && n <= 1000) {\n  console.log(n * 2);\n} else {\n  console.log("INVALID");\n}'),
    csharp: s('bool valid = System.Text.RegularExpressions.Regex.IsMatch(text, "^[+-]?[0-9]+$");\nif (valid && int.TryParse(text, out int n) && n >= -1000 && n <= 1000)\n    Console.WriteLine(n * 2);\nelse\n    Console.WriteLine("INVALID");'),
    rust: s('match text.parse::<i32>() {\n    Ok(n) if (-1000..=1000).contains(&n) => println!("{}", n * 2),\n    _ => println!("INVALID"),\n}'),
    java: s('try {\n    if (!text.matches("[+-]?[0-9]+"))\n        throw new NumberFormatException("Invalid integer format");\n    int n = Integer.parseInt(text);\n    System.out.println(n >= -1000 && n <= 1000 ? Integer.toString(n * 2) : "INVALID");\n} catch (NumberFormatException error) {\n    System.out.println("INVALID");\n}'),
    haskell: s('let digits = case text of\n        (\'+\':rest) -> rest\n        (\'-\':rest) -> rest\n        _ -> text\n    numeric = case text of\n        (\'+\':rest) -> rest\n        _ -> text\nif not (null digits) && all (\\c -> c >= \'0\' && c <= \'9\') digits\n    then case reads numeric :: [(Integer, String)] of\n        [(n, "")] | n >= -1000 && n <= 1000 -> print (n * 2)\n        _ -> putStrLn "INVALID"\n    else putStrLn "INVALID"'),
  },
  files: {
    python: s('with open("practice.txt", "w", encoding="utf-8") as file:\n    file.write(text)\nwith open("practice.txt", "r", encoding="utf-8") as file:\n    content = file.read()\nprint(len(content))'),
    javascript: s('fs.writeFileSync("practice.txt", text, "utf8");\nconst content = fs.readFileSync("practice.txt", "utf8");\nconsole.log(content.length);'),
    csharp: s('File.WriteAllText("practice.txt", text);\nstring content = File.ReadAllText("practice.txt");\nConsole.WriteLine(content.Length);'),
    rust: s('std::fs::write("practice.txt", text).unwrap();\nlet content = std::fs::read_to_string("practice.txt").unwrap();\nprintln!("{}", content.chars().count());'),
    java: s('Path file = Path.of("practice.txt");\nFiles.writeString(file, text);\nString content = Files.readString(file);\nSystem.out.println(content.length());'),
    haskell: s('writeFile "practice.txt" text\ncontent <- readFile "practice.txt"\nprint (length content)'),
  },
  concurrency: {
    python: s('from concurrent.futures import ThreadPoolExecutor\nwith ThreadPoolExecutor(max_workers=1) as pool:\n    future = pool.submit(lambda n: n * n, values[0])\n    print(future.result())'),
    javascript: s('const { Worker } = require("node:worker_threads");\nconst worker = new Worker(\n  "const {parentPort, workerData} = require(\'node:worker_threads\');" +\n  "parentPort.postMessage(workerData * workerData);",\n  { eval: true, workerData: values[0] }\n);\nworker.once("message", result => console.log(result));'),
    csharp: s('int n = values[0];\nTask<int> work = Task.Run(() => n * n);\nConsole.WriteLine(work.GetAwaiter().GetResult());'),
    rust: s('let n = values[0];\nlet work = std::thread::spawn(move || n * n);\nprintln!("{}", work.join().unwrap());'),
    java: s('int n = values[0];\nExecutorService pool = Executors.newSingleThreadExecutor();\ntry {\n    Future<Integer> work = pool.submit(() -> n * n);\n    System.out.println(work.get());\n} finally {\n    pool.shutdown();\n}'),
    haskell: s('result <- newEmptyMVar\nlet n = head values\n_ <- forkIO (putMVar result (n * n))\nanswer <- takeMVar result\nprint answer'),
  },
  testing: {
    python: s('assert square(2) == 4\nassert square(-3) == 9\nassert square(0) == 0\nprint(square(values[0]))', 'def square(n):\n    return n * n'),
    javascript: s('const assert = require("node:assert/strict");\nassert.equal(square(2), 4);\nassert.equal(square(-3), 9);\nassert.equal(square(0), 0);\nconsole.log(square(values[0]));', 'function square(n) { return n * n; }'),
    csharp: s('Assert(Square(2) == 4);\nAssert(Square(-3) == 9);\nAssert(Square(0) == 0);\nConsole.WriteLine(Square(values[0]));', 'static int Square(int n) => n * n;\nstatic void Assert(bool condition)\n{\n    if (!condition) throw new Exception("Assertion failed");\n}'),
    rust: s('assert_eq!(square(2), 4);\nassert_eq!(square(-3), 9);\nassert_eq!(square(0), 0);\nprintln!("{}", square(values[0]));', 'fn square(n: i32) -> i32 { n * n }'),
    java: s('assert square(2) == 4;\nassert square(-3) == 9;\nassert square(0) == 0;\nSystem.out.println(square(values[0]));', 'static int square(int n) { return n * n; }'),
    haskell: s('let checked = assert (square 2 == 4 && square (-3) == 9 && square 0 == 0)\nprint (checked (square (head values)))', 'square :: Int -> Int\nsquare n = n * n'),
  },
};

const indent = (text: string, count = 4) => text.split('\n').map(line => ' '.repeat(count) + line).join('\n');
export function buildProgram(language: LanguageId, topic: TopicId, solved: boolean, sample?: string): string {
  const item = snippets[topic]?.[language];
  if (!item) throw new Error(`Missing program: ${language}/${topic}`);
  const textMode = ['strings', 'errors', 'files'].includes(topic);
  const declarations = solved ? item.declarations || '' : '';
  const comment = language === 'python' ? '#' : language === 'haskell' ? '--' : '//';
  const todo = `${comment} TODO：依題目實作本主題的解法。\n`;
  const body = solved ? item.body : todo + ({ python: 'print(0)', javascript: 'console.log(0);', csharp: 'Console.WriteLine(0);', rust: 'println!("{}", 0);', java: 'System.out.println(0);', haskell: 'print (0 :: Int)' }[language]);
  const literal = sample === undefined ? null : JSON.stringify(sample);
  if (language === 'python') return `${declarations}${declarations ? '\n\n' : ''}text = ${literal ?? 'input()'}\n${textMode ? '' : 'values = list(map(int, text.split()))\n'}\n${body}\n`;
  if (language === 'javascript') return `const fs = require('node:fs');\n${declarations}${declarations ? '\n\n' : ''}const text = ${literal ?? "fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '')"};\n${textMode ? '' : 'const values = text.trim() === "" ? [] : text.trim().split(/\\s+/).map(Number);\n'}\n${body}\n`;
  if (language === 'csharp') return `using System;\nusing System.IO;\nusing System.Linq;\nusing System.Collections.Generic;\nusing System.Threading.Tasks;\n\nstring text = ${literal ?? 'Console.ReadLine() ?? ""'};\n${textMode ? '' : 'int[] values = text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray();\n'}\n${body}\n${declarations ? '\n' + declarations + '\n' : ''}`;
  if (language === 'rust') return `use std::io::{self, Read};\n\n${declarations}${declarations ? '\n\n' : ''}fn main() {\n${literal === null ? '    let mut raw = String::new();\n    io::stdin().read_to_string(&mut raw).unwrap();\n    let text = raw.trim_end_matches(&[\'\\r\', \'\\n\'][..]);' : `    let text = ${literal};`}\n${textMode ? '' : '    let values: Vec<i32> = text.split_whitespace().map(|s| s.parse().unwrap()).collect();\n'}\n${indent(body)}\n}\n`;
  if (language === 'java') return `import java.util.*;\nimport java.nio.file.*;\nimport java.math.BigInteger;\nimport java.util.concurrent.*;\n\npublic class Main {\n${declarations ? indent(declarations) + '\n\n' : ''}    public static void main(String[] args) throws Exception {\n        String text = ${literal ?? 'new Scanner(System.in).nextLine()'};\n${textMode ? '' : '        int[] values = text.isBlank() ? new int[0] : Arrays.stream(text.trim().split("\\\\s+")).mapToInt(Integer::parseInt).toArray();\n'}\n${indent(body, 8)}\n    }\n}\n`;
  return `import Data.Char (toUpper)\nimport qualified Data.Map.Strict as Map\nimport qualified Data.Set as Set\nimport Control.Concurrent (forkIO, newEmptyMVar, putMVar, takeMVar)\nimport Control.Exception (assert)\n\n${declarations}${declarations ? '\n\n' : ''}main :: IO ()\nmain = do\n    ${literal === null ? 'text <- getLine' : `let text = ${literal}`}\n${textMode ? '' : '    let values = map read (words text) :: [Int]\n'}\n${indent(body)}\n`;
}
