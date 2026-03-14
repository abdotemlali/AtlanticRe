import logging
from sqlalchemy import inspect
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_startup():
    from main import startup_event
    await startup_event()
    
    # check if 'users' table exists
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        logger.info("Table 'users' verified in DB.")
        
        # Check users content
        from database import SessionLocal
        import db_models
        db = SessionLocal()
        users = db.query(db_models.User).all()
        for u in users:
            logger.info(f"User in DB: {u.username} (Role: {u.role})")
        db.close()
    else:
        logger.error("Table 'users' NOT FOUND.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_startup())
