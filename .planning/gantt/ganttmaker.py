import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE_FILE = ROOT / "Feb23.gantt"
OUTPUT_FILE = ROOT / "Feb23_updated.gantt"


def main() -> None:
  if not SOURCE_FILE.exists():
    raise FileNotFoundError(f"Source gantt file not found: {SOURCE_FILE}")

  with SOURCE_FILE.open("r", encoding="utf-8") as source:
    data = json.load(source)

  with OUTPUT_FILE.open("w", encoding="utf-8") as target:
    json.dump(data, target, ensure_ascii=False, indent=2)

  print(OUTPUT_FILE)


if __name__ == "__main__":
  main()
