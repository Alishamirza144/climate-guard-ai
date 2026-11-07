import sys
from pathlib import Path

backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

root_dir = str(Path(__file__).resolve().parent.parent)
while root_dir in sys.path:
    sys.path.remove(root_dir)
