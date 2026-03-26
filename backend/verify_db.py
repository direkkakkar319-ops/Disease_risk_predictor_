
import sys
import os
from pathlib import Path

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

try:
    from app.database import engine, Base
    from app.auth.models import User
    from app.models import Report, Task
    from sqlalchemy import inspect
    
    print("Database URL:", engine.url)
    
    # Check if connection works
    with engine.connect() as conn:
        print("Successfully connected to the database!")
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print("Existing tables in database:", tables)
        
        # Check if 'users' table exists
        if 'users' in tables:
            print("Table 'users' EXISTS.")
        else:
            print("Table 'users' DOES NOT EXIST.")
            
        # Check metadata
        print("Tables registered in Base.metadata:", list(Base.metadata.tables.keys()))
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
