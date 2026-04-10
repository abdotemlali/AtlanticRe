import sys
import traceback
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

from services.retro_service import load_retro_excel, compute_by_courtier, compute_retro_summary, compute_by_traite

try:
    load_retro_excel()
except Exception as e:
    print("Error in load_retro_excel:")
    traceback.print_exc()
    sys.exit(1)

from services.retro_service import get_retro_df
df = get_retro_df()

print("Testing compute_by_courtier...")
try:
    compute_by_courtier(df)
    print("compute_by_courtier OK")
except Exception as e:
    print("Error in compute_by_courtier:")
    traceback.print_exc()

print("\nTesting compute_retro_summary...")
try:
    compute_retro_summary(df)
    print("compute_retro_summary OK")
except Exception as e:
    print("Error in compute_retro_summary:")
    traceback.print_exc()

print("\nTesting compute_by_traite...")
try:
    compute_by_traite(df)
    print("compute_by_traite OK")
except Exception as e:
    print("Error in compute_by_traite:")
    traceback.print_exc()
