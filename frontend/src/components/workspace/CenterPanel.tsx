import { useState } from 'react'
import { TopicHeader } from './TopicHeader'
import { MarkdownViewer } from './MarkdownViewer'

interface CenterPanelProps {
  topic?: string
  subject?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  mode?: string
  content?: string
  onBack?: () => void
}

const sampleContent = `## Overview

Binary Search Trees (BST) are a fundamental data structure in computer science that maintain sorted data and enable efficient search, insertion, and deletion operations.

### Key Properties

- Each node has at most two children (left and right)
- Left subtree contains values **less than** the parent node
- Right subtree contains values **greater than** the parent node
- No duplicate nodes (in standard definition)

### Time Complexity

| Operation | Average | Worst Case |
|-----------|---------|------------|
| Search    | O(log n) | O(n) |
| Insert    | O(log n) | O(n) |
| Delete    | O(log n) | O(n) |

### Example

\`\`\`
        8
       / \\
      3   10
     / \\    \\
    1   6    14
       / \\   /
      4   7 13
\`\`\`

### Traversal Methods

1. **In-order**: Left → Root → Right (produces sorted order)
2. **Pre-order**: Root → Left → Right
3. **Post-order**: Left → Right → Root

> A BST without balancing can degenerate into a linked list, leading to O(n) operations.
`

export function CenterPanel({
  topic = 'Binary Search Trees',
  subject = 'Data Structures & Algorithms',
  difficulty = 'intermediate',
  mode = 'Explanation',
  content,
  onBack,
}: CenterPanelProps) {
  return (
    <div className="flex flex-col h-full p-6">
      <TopicHeader
        topic={topic}
        subject={subject}
        difficulty={difficulty}
        mode={mode}
        onBack={onBack}
      />
      <div className="flex-1 mt-4">
        <MarkdownViewer content={content || sampleContent} />
      </div>
    </div>
  )
}
