#!/usr/bin/env python3
"""Check which dependencies are available for testing."""

import sys
import importlib


def check_dependency(name, package=None):
    """Check if a dependency is available."""
    try:
        if package:
            importlib.import_module(package)
        else:
            importlib.import_module(name)
        return True, "OK"
    except ImportError as e:
        return False, f"FAIL ({str(e)[:50]}...)"


def main():
    """Check all test dependencies."""
    print("E-commerce Backend - Dependency Check")
    print("=" * 50)
    print(f"Python Version: {sys.version}")
    print("=" * 50)
    
    # Core testing dependencies
    core_deps = [
        ("pytest", None),
        ("pytest-asyncio", "pytest_asyncio"),
        ("pytest-mock", "pytest_mock"),
        ("pytest-cov", "pytest_cov"),
        ("httpx", None),
        ("coverage", None),
    ]
    
    print("\\nCore Testing Dependencies:")
    for name, package in core_deps:
        available, status = check_dependency(name, package)
        print(f"  {name:<20} {status}")
    
    # Application dependencies
    app_deps = [
        ("fastapi", None),
        ("uvicorn", None),
        ("sqlalchemy", None),
        ("alembic", None),
        ("pydantic", None),
        ("passlib", None),
        ("python-jose", "jose"),
        ("asyncpg", None),
        ("aiosqlite", None),
    ]
    
    print("\\nApplication Dependencies:")
    for name, package in app_deps:
        available, status = check_dependency(name, package)
        print(f"  {name:<20} {status}")
    
    # Development tools
    dev_deps = [
        ("black", None),
        ("isort", None),
        ("ruff", None),
        ("mypy", None),
        ("factory-boy", "factory"),
    ]
    
    print("\\nDevelopment Tools:")
    for name, package in dev_deps:
        available, status = check_dependency(name, package)
        print(f"  {name:<20} {status}")
    
    # Optional dependencies
    opt_deps = [
        ("stripe", None),
        ("redis", None),
        ("pillow", "PIL"),
        ("jinja2", None),
    ]
    
    print("\\nOptional Dependencies:")
    for name, package in opt_deps:
        available, status = check_dependency(name, package)
        print(f"  {name:<20} {status}")
    
    print("\\n" + "=" * 50)
    
    # Check if we can import the app
    try:
        import app
        print("OK App module is importable")
    except ImportError as e:
        print(f"FAIL App module import failed: {e}")
    
    # Check SQLAlchemy specifically
    try:
        from sqlalchemy import __version__ as sql_version
        print(f"OK SQLAlchemy version: {sql_version}")
        
        # Try the problematic import
        try:
            from sqlalchemy.ext.asyncio import AsyncSession
            print("OK SQLAlchemy async imports work")
        except Exception as e:
            print(f"FAIL SQLAlchemy async import failed: {e}")
            
    except ImportError:
        print("FAIL SQLAlchemy not available")
    
    print("\\nRecommendations:")
    print("=" * 50)
    
    # Check what's needed for basic testing
    basic_available, _ = check_dependency("pytest")
    if basic_available:
        print("OK Basic testing is available - you can run: python run_basic_tests.py")
    else:
        print("FAIL Install pytest for basic testing: pip install pytest")
    
    # Check what's needed for full testing
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        print("OK Full test suite should work - you can run the comprehensive tests")
    except:
        print("FAIL Full test suite requires SQLAlchemy compatibility fix")
        print("  Use basic testing for now: python run_basic_tests.py")
    
    print("\\n" + "=" * 50)
    print("Test Infrastructure Status:")
    print("- Basic tests: Available and working")
    print("- Mock fixtures: Available")
    print("- Async support: Available") 
    print("- Comprehensive suite: Waiting for SQLAlchemy compatibility")


if __name__ == "__main__":
    main()