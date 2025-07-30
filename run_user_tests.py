#!/usr/bin/env python3
"""
Script to run user management tests and collect coverage information.
"""

import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {cmd}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.stdout:
            print("STDOUT:")
            print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode != 0:
            print(f"❌ Command failed with return code {result.returncode}")
            return False
        else:
            print("✅ Command completed successfully")
            return True
            
    except Exception as e:
        print(f"❌ Error running command: {e}")
        return False


def main():
    """Main test runner."""
    print("🧪 User Management Test Runner")
    print("================================")
    
    # Ensure we're in the correct directory
    os.chdir(Path(__file__).parent)
    
    # Test categories to run
    test_categories = [
        {
            "name": "Unit Tests - Models",
            "command": "python -m pytest tests/unit/test_user_models.py -v --tb=short",
            "description": "Testing User, Address, and AuditLog models"
        },
        {
            "name": "Unit Tests - Audit Service",
            "command": "python -m pytest tests/unit/test_audit_service.py -v --tb=short",
            "description": "Testing AuditService functionality"
        },
        {
            "name": "Unit Tests - User CRUD",
            "command": "python -m pytest tests/unit/test_user_crud.py -v --tb=short",
            "description": "Testing user CRUD operations"
        },
        {
            "name": "Unit Tests - Address CRUD",
            "command": "python -m pytest tests/unit/test_address_crud.py -v --tb=short",
            "description": "Testing address CRUD operations"
        },
        {
            "name": "Integration Tests - User Endpoints",
            "command": "python -m pytest tests/integration/test_user_endpoints.py -v --tb=short",
            "description": "Testing user management API endpoints"
        },
        {
            "name": "Integration Tests - Admin Endpoints",
            "command": "python -m pytest tests/integration/test_admin_user_endpoints.py -v --tb=short",
            "description": "Testing admin user management endpoints"
        }
    ]
    
    # Run each test category
    results = []
    for category in test_categories:
        success = run_command(category["command"], category["description"])
        results.append({
            "name": category["name"],
            "success": success
        })
    
    # Run all user management tests with coverage
    print(f"\n{'='*60}")
    print("Running all user management tests with coverage...")
    print(f"{'='*60}")
    
    coverage_cmd = (
        "python -m pytest "
        "tests/unit/test_user_models.py "
        "tests/unit/test_audit_service.py "
        "tests/unit/test_user_crud.py "
        "tests/unit/test_address_crud.py "
        "tests/integration/test_user_endpoints.py "
        "tests/integration/test_admin_user_endpoints.py "
        "--cov=app.models.user "
        "--cov=app.models.address "
        "--cov=app.models.audit_log "
        "--cov=app.services.audit_service "
        "--cov=app.crud.crud_user "
        "--cov=app.crud.crud_address "
        "--cov=app.api.api_v1.endpoints.users "
        "--cov-report=term-missing "
        "--cov-report=html:htmlcov "
        "--cov-fail-under=80 "
        "-v"
    )
    
    coverage_success = run_command(coverage_cmd, "Full test suite with coverage")
    
    # Print summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    
    for result in results:
        status = "✅ PASSED" if result["success"] else "❌ FAILED"
        print(f"{result['name']}: {status}")
    
    overall_success = all(result["success"] for result in results) and coverage_success
    
    if overall_success:
        print("\n🎉 All tests passed!")
        print("📊 Coverage report generated in htmlcov/index.html")
    else:
        print("\n⚠️  Some tests failed. Please check the output above.")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())