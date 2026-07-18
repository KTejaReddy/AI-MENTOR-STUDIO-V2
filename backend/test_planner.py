import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.ai.planner_agent import planner_agent

tests = [
    ("Engineering Mathematics", "Differential Equations"),
    ("Programming", "Binary Search Trees"),
    ("Digital Electronics", "Flip Flops"),
    ("Chemistry", "Chemical Bonding"),
    ("English", "Technical Communication")
]

for subject, topic in tests:
    print(f"\n--- Testing: {subject} | {topic} ---")
    plan = planner_agent.plan(subject, topic, difficulty="intermediate", learning_mode="default")
    print(f"Topic Category: {plan.topic_category}")
    print(f"Sections: {plan.sections}")
