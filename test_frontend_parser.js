const questionSplitter = /(?:^|\n)\s*(?:\*{0,2})(?:Q\s*)?(\d+)[\.\)]\s*(?:\*{0,2})/gm;
const optionLinePattern = /^(?:\*{0,2})?[A-Ea-e][\.\)]\s+.+/;
const correctPattern = /\*{0,2}Correct\s+Answer\s*:\s*\[?([A-Ea-e])\]?(?:\s*[-—]\s*(.+?))?\*{0,2}/i;
const explPattern = /(?:\*{0,2})(?:Explanation|Why(?:\s+others\s+are\s+wrong)?|Note)\s*:\s*\*{0,2}\s*(.+?)(?=\n\n|\n\s*\*{0,2}(?:Q|\d)|\Z)/is;

const markdown = `1. What is React?
A. Library
B. Framework
C. Language
D. OS
**Correct Answer: A**
**Explanation:** It is a UI library.

2. What is Node?
A. Browser
B. Runtime
C. IDE
D. Language
**Correct Answer: B**
**Explanation:** JavaScript runtime.`;

console.log('RAW QUIZ CONTENT:\n' + markdown + '\n');

const matches = [];
let m;
while ((m = questionSplitter.exec(markdown)) !== null) {
  matches.push({ index: m.index, num: parseInt(m[1], 10) });
}
console.log('SPLITTER MATCHES:', matches);

const questions = [];
for (let i = 0; i < matches.length; i++) {
  const start = matches[i].index;
  const end = i + 1 < matches.length ? matches[i + 1].index : markdown.length;
  const block = markdown.slice(start, end).trim();
  console.log('\n--- EVALUATING BLOCK ' + (i+1) + ' ---');
  console.log(block);
  
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  let questionEndIdx = lines.findIndex(l => optionLinePattern.test(l));
  console.log('questionEndIdx (first option line index):', questionEndIdx);
  
  if (questionEndIdx === -1) {
    console.log('FAIL: Could not find any line matching optionLinePattern:', optionLinePattern.toString());
    continue;
  }
  
  // Find afterOptionsIdx manually just like the frontend code
  let afterOptionsIdx = questionEndIdx;
  while (afterOptionsIdx < lines.length) {
    const l = lines[afterOptionsIdx];
    if (optionLinePattern.test(l)) {
      afterOptionsIdx++;
    } else {
      break;
    }
  }
  
  const remainingBlock = lines.slice(afterOptionsIdx).join('\n');
  console.log('REMAINING BLOCK:\n' + remainingBlock);
  
  const correctMatch = remainingBlock.match(correctPattern);
  console.log('CORRECT MATCH:', correctMatch ? correctMatch[0] : 'null (Regex: ' + correctPattern.toString() + ')');
  
  const explMatch = remainingBlock.match(explPattern);
  console.log('EXPL MATCH:', explMatch ? explMatch[0] : 'null (Regex: ' + explPattern.toString() + ')');
  
  if (!correctMatch) {
      console.log('FAIL: Correct answer match failed.');
      continue;
  }
  
  questions.push({ parsed: true });
}

console.log('\nPARSED QUESTIONS LENGTH:', questions.length);
