import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE_FILE = ROOT / "Feb23.gantt"
OUTPUT_FILE = ROOT / "Feb23_updated.gantt"
OUTPUT_NO_SUBTASKS_FILE = ROOT / "Feb23_no_subtasks.gantt"


def build_no_subtasks_version(data: dict) -> dict:
  result = dict(data)
  root_items = result.get("data")
  if not isinstance(root_items, list):
    return result

  cleaned_roots = []
  for root in root_items:
    root_copy = dict(root)
    subtasks = root_copy.get("subtasks")
    if isinstance(subtasks, list):
      root_copy["subtasks"] = [{k: v for k, v in task.items() if k != "subtasks"} for task in subtasks]
    cleaned_roots.append(root_copy)

  result["data"] = cleaned_roots
  return result


def main() -> None:
  if not SOURCE_FILE.exists():
    raise FileNotFoundError(f"Source gantt file not found: {SOURCE_FILE}")

  with SOURCE_FILE.open("r", encoding="utf-8") as source:
    data = json.load(source)

  with OUTPUT_FILE.open("w", encoding="utf-8") as target:
    json.dump(data, target, ensure_ascii=False, indent=2)

  no_subtasks_data = build_no_subtasks_version(data)
  with OUTPUT_NO_SUBTASKS_FILE.open("w", encoding="utf-8") as target:
    json.dump(no_subtasks_data, target, ensure_ascii=False, indent=2)

  print(OUTPUT_FILE)
  print(OUTPUT_NO_SUBTASKS_FILE)


if __name__ == "__main__":
  main()
