import pymysql
import os

def create_database_if_not_exists():
    # Use environment variables if available or fallback to defaults provided by user
    host = os.getenv("DB_HOST", "localhost")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "root")
    
    try:
        connection = pymysql.connect(host=host, user=user, password=password)
        try:
            with connection.cursor() as cursor:
                cursor.execute("CREATE DATABASE IF NOT EXISTS reinsurance;")
            connection.commit()
            print("Database 'reinsurance' exists or was created successfully.")
        finally:
            connection.close()
    except Exception as e:
        print(f"Error connecting to MySQL or creating database: {e}")

if __name__ == "__main__":
    create_database_if_not_exists()
