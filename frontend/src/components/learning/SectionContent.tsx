import { memo, type ReactNode } from 'react'
import { LearningCard } from './LearningCard'
import { CodeCard } from './CodeCard'
import { QuizCard } from './QuizCard'
import { CheatSheetCard } from './CheatSheetCard'
import { DiagramCard } from './DiagramCard'
import { ProjectCard, sampleProject } from './ProjectCard'
import { InterviewCard } from './InterviewCard'
import {
  BookOpenText,
  FileText,
  Lightbulb,
  Puzzle,
  BookmarkIcon,
  BarChart3,
  Code2,
  Zap,
  Eye,
  ClipboardList,
  FileSpreadsheet,
  Rocket,
  AlertTriangle,
  Briefcase,
  Library,
} from 'lucide-react'

const sampleCode = `class BSTNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

class BST:
    def __init__(self):
        self.root = None

    def insert(self, key):
        if not self.root:
            self.root = BSTNode(key)
            return
        curr = self.root
        while curr:
            if key < curr.key:
                if curr.left:
                    curr = curr.left
                else:
                    curr.left = BSTNode(key)
                    return
            else:
                if curr.right:
                    curr = curr.right
                else:
                    curr.right = BSTNode(key)
                    return

    def search(self, key) -> bool:
        curr = self.root
        while curr:
            if key == curr.key:
                return True
            curr = curr.left if key < curr.key else curr.right
        return False

    def inorder(self, node=None, result=None):
        if result is None:
            result = []
            node = self.root
        if node:
            self.inorder(node.left, result)
            result.append(node.key)
            self.inorder(node.right, result)
        return result

bst = BST()
bst.insert(8); bst.insert(3); bst.insert(10)
bst.insert(1); bst.insert(6)
print(bst.inorder())   # [1, 3, 6, 8, 10]
print(bst.search(6))    # True`

const diagramExample = `graph TD
    A[Root: 8] --> B[Left: 3]
    A --> C[Right: 10]
    B --> D[Left: 1]
    B --> E[Right: 6]
    E --> F[Left: 4]
    E --> G[Right: 7]
    C --> H[Right: 14]
    H --> I[Left: 13]`

interface SectionContentProps {
  sectionId: string
}

export const SectionContent = memo(function SectionContent({ sectionId }: SectionContentProps) {
  const content = sectionContentMap[sectionId]
  if (!content) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-text-tertiary">
        Content not available
      </div>
    )
  }
  return <>{content}</>
})

const sectionContentMap: Record<string, ReactNode> = {
  explanation: (
    <LearningCard
      icon={<BookOpenText className="w-4 h-4 text-accent-light" />}
      title="Explanation"
    >
      <div className="prose dark:prose-invert max-w-none text-sm text-text-secondary leading-relaxed space-y-4">
        <p>A <strong>Binary Search Tree (BST)</strong> is a node-based binary tree data structure with the following properties:</p>
        <ul className="space-y-2">
          <li>The left subtree of a node contains only nodes with keys <strong>less than</strong> the node's key</li>
          <li>The right subtree of a node contains only nodes with keys <strong>greater than</strong> the node's key</li>
          <li>The left and right subtree each must also be a binary search tree</li>
          <li>There must be no duplicate nodes</li>
        </ul>
        <p>The BST property enables efficient searching, insertion, and deletion operations, making it one of the most fundamental data structures in computer science.</p>
        <div className="p-4 rounded-xl bg-surface-150 border border-border font-mono text-xs leading-loose">
          <pre>{`        8
       / \\
      3   10
     / \\    \\
    1   6    14
       / \\   /
      4   7 13`}</pre>
        </div>
      </div>
    </LearningCard>
  ),
  'case-study': (
    <LearningCard
      icon={<FileText className="w-4 h-4 text-sky-400" />}
      title="Case Study"
    >
      <div className="text-sm text-text-secondary leading-relaxed space-y-4">
        <p className="font-medium text-text-primary">Database Indexing with B-Trees</p>
        <p>While simple BSTs work well for in-memory data, production databases use <strong>B-Trees</strong> for disk-based storage optimization.</p>
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-2">The Problem</p>
          <p className="text-xs">A standard BST with 1 million nodes requires ~20 comparisons. But each comparison may require a disk seek (~10ms), making queries slow.</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-2">The Solution</p>
          <p className="text-xs">B-Trees store hundreds of keys per node, reducing tree height. A B-Tree with 1000 keys per node can store 1 billion entries with just 3 levels.</p>
        </div>
        <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
          <p className="text-xs font-medium text-accent-light mb-2">Real-World Impact</p>
          <ul className="text-xs space-y-1">
            <li>• PostgreSQL uses B-Tree indexes by default</li>
            <li>• MySQL InnoDB uses B+ Trees for clustered indexes</li>
            <li>• MongoDB uses B-Tree as its default index type</li>
          </ul>
        </div>
      </div>
    </LearningCard>
  ),
  analogy: (
    <LearningCard
      icon={<Lightbulb className="w-4 h-4 text-amber-400" />}
      title="Analogy"
    >
      <div className="text-sm text-text-secondary leading-relaxed space-y-4">
        <p className="font-medium text-text-primary">Library Catalog System</p>
        <p>Think of a BST as a well-organized library where each bookshelf is recursively organized:</p>
        <div className="p-4 rounded-xl bg-surface-150 border border-border space-y-2">
          <p className="text-xs font-medium text-text-primary">The Librarian's Method:</p>
          <ul className="text-xs space-y-1">
            <li>• Books starting before 'M' go to the <strong className="text-accent-light">left aisle</strong></li>
            <li>• Books starting after 'M' go to the <strong className="text-accent-light">right aisle</strong></li>
            <li>• Each aisle is recursively organized the same way</li>
          </ul>
        </div>
        <p>To find "Algorithms": Start at M → "Algorithms" {'<'} M, go left → find D → "Algorithms" {'<'} D, go left → found! Only 3 checks instead of searching every shelf.</p>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          ⚠️ If books arrive sorted (A, B, C...), they'd all go to the right — creating a degenerated tree (linked list). That's why self-balancing trees exist!
        </div>
      </div>
    </LearningCard>
  ),
  examples: (
    <LearningCard
      icon={<Puzzle className="w-4 h-4 text-emerald-400" />}
      title="Examples"
    >
      <div className="text-sm text-text-secondary leading-relaxed space-y-4">
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-2">Example 1: Searching in a BST</p>
          <p className="text-xs">Find value 6 in the BST: Start at 8 → 6 {'<'} 8, go left → 6 {'>'} 3, go right → 6 {'>'} 4, go right → Found!</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-2">Example 2: Insertion</p>
          <p className="text-xs">Insert 5: Traverse like search (8 → 3 → 6 → 4), then add as right child of 4 since 5 {'>'} 4.</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-2">Example 3: In-order Traversal</p>
          <p className="text-xs">Visit Left → Root → Right: [1, 3, 4, 6, 7, 8, 10, 13, 14] — Notice it's sorted!</p>
        </div>
      </div>
    </LearningCard>
  ),
  'cheat-sheet': (
    <CheatSheetCard />
  ),
  diagram: (
    <DiagramCard diagram={diagramExample} title="BST Structure" />
  ),
  code: (
    <CodeCard code={sampleCode} language="python" title="BST Implementation" />
  ),
  complexity: (
    <LearningCard
      icon={<Zap className="w-4 h-4 text-amber-400" />}
      title="Complexity Analysis"
    >
      <div className="text-sm text-text-secondary leading-relaxed space-y-4">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-150 border-b border-border">
                <th className="px-4 py-2 text-left text-text-primary font-medium">Operation</th>
                <th className="px-4 py-2 text-center text-text-primary font-medium">Average</th>
                <th className="px-4 py-2 text-center text-text-primary font-medium">Worst</th>
                <th className="px-4 py-2 text-center text-text-primary font-medium">Space</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['Search', 'O(log n)', 'O(n)', 'O(1)'],
                ['Insert', 'O(log n)', 'O(n)', 'O(1)'],
                ['Delete', 'O(log n)', 'O(n)', 'O(1)'],
                ['Find Min', 'O(log n)', 'O(n)', 'O(1)'],
                ['Traversal', 'O(n)', 'O(n)', 'O(n)'],
              ].map(([op, avg, worst, space]) => (
                <tr key={op} className="hover:bg-surface-100">
                  <td className="px-4 py-2 font-medium text-text-primary">{op}</td>
                  <td className="px-4 py-2 text-center text-emerald-400">{avg}</td>
                  <td className="px-4 py-2 text-center text-red-400">{worst}</td>
                  <td className="px-4 py-2 text-center text-text-secondary">{space}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          ⚠️ Worst case O(n) occurs when the BST becomes skewed (e.g., inserting sorted data). Self-balancing trees like AVL and Red-Black maintain O(log n) height.
        </div>
      </div>
    </LearningCard>
  ),
  visualizer: (
    <LearningCard
      icon={<Eye className="w-4 h-4 text-violet-400" />}
      title="Visualizer"
    >
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
          <Eye className="w-10 h-10 text-violet-400" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">BST Visualizer</p>
        <p className="text-xs text-text-tertiary max-w-xs">
          Interactive tree visualization will render here, allowing you to insert, delete, and search nodes visually.
        </p>
        <span className="mt-4 px-3 py-1 rounded-full bg-violet-500/10 text-xs text-violet-400">
          Interactive component placeholder
        </span>
      </div>
    </LearningCard>
  ),
  quiz: (
    <QuizCard />
  ),
  assignment: (
    <LearningCard
      icon={<FileSpreadsheet className="w-4 h-4 text-orange-400" />}
      title="Assignment"
    >
      <div className="text-sm text-text-secondary leading-relaxed space-y-4">
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-3">Problem Set</p>
          <ol className="space-y-3 text-xs">
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent-light shrink-0">1</span>
              Implement a BST class with insert, search, and delete operations.
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent-light shrink-0">2</span>
              Write a function that returns the kth smallest element in the BST.
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent-light shrink-0">3</span>
              Implement a function to check if a binary tree is a valid BST.
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent-light shrink-0">4</span>
              Write a function to find the lowest common ancestor of two nodes.
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent-light shrink-0">5</span>
              Implement a function to convert a sorted array to a balanced BST.
            </li>
          </ol>
        </div>
        <div className="p-3 rounded-lg bg-accent/5 border border-accent/10 text-xs text-accent-light">
          💡 Submit your solutions for AI-powered code review and feedback.
        </div>
      </div>
    </LearningCard>
  ),
  projects: (
    <ProjectCard project={sampleProject} />
  ),
  'common-mistakes': (
    <LearningCard
      icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
      title="Common Mistakes"
    >
      <div className="text-sm text-text-secondary leading-relaxed space-y-3">
        {[
          { mistake: 'Not updating parent references during deletion', fix: 'Always maintain a parent pointer or use recursion to track the parent node when deleting.' },
          { mistake: 'Confusing BST property with heap property', fix: 'In a BST: left < root < right. In a heap: parent > children (no left/right ordering).' },
          { mistake: 'Assuming binary tree is always balanced', fix: 'Standard BSTs can become skewed. Use AVL or Red-Black trees when balance is critical.' },
          { mistake: 'Not handling duplicate values', fix: 'Decide on a convention — either reject duplicates or consistently insert them on one side.' },
        ].map(({ mistake, fix }, i) => (
          <div key={i} className="p-3 rounded-xl bg-surface-150 border border-border">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-xs text-red-400 shrink-0 mt-0.5">!</span>
              <div>
                <p className="text-xs font-medium text-red-300 mb-1">{mistake}</p>
                <p className="text-xs text-text-tertiary">{fix}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </LearningCard>
  ),
  'interview-questions': (
    <InterviewCard />
  ),
  references: (
    <LearningCard
      icon={<Library className="w-4 h-4 text-indigo-400" />}
      title="References"
    >
      <div className="text-sm text-text-secondary leading-relaxed space-y-4">
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-3">Books</p>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center justify-between">
              <span>Introduction to Algorithms (CLRS)</span>
              <span className="text-text-tertiary">Ch. 12</span>
            </li>
            <li className="flex items-center justify-between">
              <span>The Algorithm Design Manual (Skiena)</span>
              <span className="text-text-tertiary">Ch. 3</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Cracking the Coding Interview</span>
              <span className="text-text-tertiary">Trees</span>
            </li>
          </ul>
        </div>
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-3">Practice Problems</p>
          <div className="space-y-2 text-xs">
            {[
              ['Validate BST', 'LeetCode 98', 'Medium'],
              ['Kth Smallest', 'LeetCode 230', 'Medium'],
              ['LCA of BST', 'LeetCode 235', 'Easy'],
              ['Serialize BST', 'LeetCode 449', 'Medium'],
            ].map(([problem, platform, difficulty]) => (
              <div key={problem} className="flex items-center justify-between py-1">
                <span>{problem}</span>
                <div className="flex items-center gap-2">
                  <span className="text-text-tertiary">{platform}</span>
                  <span className={difficulty === 'Easy' ? 'text-emerald-400' : difficulty === 'Medium' ? 'text-amber-400' : 'text-red-400'}>{difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LearningCard>
  ),
}
