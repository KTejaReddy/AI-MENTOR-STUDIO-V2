import asyncio
import re

async def test_parser():
    active_sections = [
        ("overview", "Overview"),
        ("explanation", "Explanation"),
        ("formulae", "Formulae"),
        ("graphs", "Graphs"),
        ("quiz", "Quiz"),
        ("summary", "Summary")
    ]
    accumulated_content = {st: "" for st, _ in active_sections}
    header_pattern = re.compile(r"^\s*(?:\*|_)*#+\s+(?:\*|_)*(.*)$", re.IGNORECASE)

    active_st = "overview"
    events = []

    samples = [
        "## Overview\ncontent1",
        "### Overview\ncontent2",
        "#### Overview\ncontent3",
        "## **Overview**\ncontent4",
        "### **Explanation**\ncontent5",
        "## Explanation:\ncontent6",
        "## 2. Explanation\ncontent7",
        "### 2) Formulae\ncontent8",
        "## [Graphs]\ncontent9",
        "## {Quiz}\ncontent10",
        "## Summary\ncontent11"
    ]

    for chunk in samples:
        lines = chunk.split("\n")
        for line in lines:
            match = header_pattern.match(line.strip())
            if match:
                raw_title = match.group(1).strip("*_: ")
                st_match = re.search(r"[\(\[\{]?Section ID:\s*([a-zA-Z0-9_]+)[\)\]\}]?", raw_title, re.IGNORECASE)
                st_group = st_match.group(1) if st_match else None
                
                if st_match:
                    title_group = raw_title[:st_match.start()].strip("*_: -.")
                else:
                    title_group = raw_title.strip("*_: -.")
                    
                title_group = re.sub(r"^(?:Section\s*\d+|Step\s*\d+|\d+)\s*[:\.\-\)]?\s*", "", title_group, flags=re.IGNORECASE).strip()
                
                new_st = st_group
                
                if new_st and new_st not in accumulated_content:
                    if new_st.lower() in accumulated_content:
                        new_st = new_st.lower()
                    else:
                        new_st = None
                        
                if not new_st:
                    # Fuzzy match title
                    matched = False
                    for pst, ptitle in active_sections:
                        norm_ptitle = ptitle.lower().replace(" ", "")
                        norm_title = title_group.lower().replace(" ", "")
                        
                        # Handle brackets stripping in title for matching
                        clean_title = re.sub(r"[\[\]\{\}\(\)]", "", norm_title)
                        if clean_title == norm_ptitle or norm_ptitle in clean_title:
                            new_st = pst
                            matched = True
                            break
                    if not matched:
                        new_st = active_st if active_st else active_sections[0][0]
                        
                if active_st and new_st != active_st:
                    events.append(f"section_done: {active_st}")
                if new_st != active_st:
                    active_st = new_st
                    events.append(f"section_status: {active_st}")
            else:
                if active_st:
                    accumulated_content[active_st] += line + "\n"
                    events.append(f"section_chunk: {active_st}")

    for e in events:
        print(e)
        
    print("\nAccumulated keys:")
    for k, v in accumulated_content.items():
        if v.strip():
            print(f"- {k}: {v.strip()}")

if __name__ == '__main__':
    asyncio.run(test_parser())
