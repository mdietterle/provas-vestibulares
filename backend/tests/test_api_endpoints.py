import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base

# Setup Test Database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override dependencies
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def get_all_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            if "GET" in route.methods and "/questions" in route.path:
                routes.append(route.path)
    return routes

@pytest.mark.parametrize("route_path", get_all_routes())
def test_all_get_questions(route_path):
    response = client.get(route_path)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def get_import_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            if "POST" in route.methods and "/import" in route.path:
                routes.append(route.path)
    return routes

# We mock the authentication for POST endpoints
from app.routers.auth import get_current_user
from app.models import User

def override_get_current_user():
    return User(id=1, email="test@test.com", role="owner", name="Test Owner")

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.mark.parametrize("route_path", get_import_routes())
def test_all_import_post(route_path):
    # This just tests if the endpoint accepts the request and spawns a background task
    response = client.post(route_path)
    # The endpoints that require a body (like acafe import-url) will return 422, 
    # but the generic import-all endpoints will return 200.
    assert response.status_code in [200, 422]
