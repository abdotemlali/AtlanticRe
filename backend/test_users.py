import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import SessionLocal
from services.user_service import get_users

def test():
    db = SessionLocal()
    try:
        users = get_users(db)
        print("SUCCESS! Users loaded:", len(users))
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test()
