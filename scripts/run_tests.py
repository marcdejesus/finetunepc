#!/usr/bin/env python3
"""Test runner script with coverage reporting."""

import os
import sys
import subprocess
import argparse
from pathlib import Path


def run_command(cmd: list, cwd: Path = None) -> int:
    """Run a command and return the exit code."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    return result.returncode


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="Run tests with coverage")
    parser.add_argument(
        "--unit", 
        action="store_true", 
        help="Run only unit tests"
    )
    parser.add_argument(
        "--integration", 
        action="store_true", 
        help="Run only integration tests"
    )
    parser.add_argument(
        "--auth", 
        action="store_true", 
        help="Run only auth tests"
    )
    parser.add_argument(
        "--models", 
        action="store_true", 
        help="Run only model tests"
    )
    parser.add_argument(
        "--services", 
        action="store_true", 
        help="Run only service tests"
    )
    parser.add_argument(
        "--api", 
        action="store_true", 
        help="Run only API tests"
    )
    parser.add_argument(
        "--coverage", 
        action="store_true", 
        default=True,
        help="Generate coverage report (default: True)"
    )
    parser.add_argument(
        "--html", 
        action="store_true", 
        help="Generate HTML coverage report"
    )
    parser.add_argument(
        "--xml", 
        action="store_true", 
        help="Generate XML coverage report"
    )
    parser.add_argument(
        "--fail-under", 
        type=int, 
        default=80,
        help="Fail if coverage is under this percentage (default: 80)"
    )
    parser.add_argument(
        "--verbose", 
        "-v", 
        action="store_true", 
        help="Verbose output"
    )
    parser.add_argument(
        "--debug", 
        action="store_true", 
        help="Debug mode"
    )
    parser.add_argument(
        "path", 
        nargs="?", 
        help="Specific test path to run"
    )
    
    args = parser.parse_args()
    
    # Get project root
    project_root = Path(__file__).parent.parent
    
    # Build pytest command
    pytest_cmd = ["python", "-m", "pytest"]
    
    # Add verbosity
    if args.verbose:
        pytest_cmd.append("-v")
    elif args.debug:
        pytest_cmd.extend(["-v", "-s"])
    
    # Add coverage if enabled
    if args.coverage:
        pytest_cmd.extend([
            "--cov=app",
            "--cov-report=term-missing",
            f"--cov-fail-under={args.fail_under}"
        ])
        
        if args.html:
            pytest_cmd.append("--cov-report=html")
        
        if args.xml:
            pytest_cmd.append("--cov-report=xml")
    
    # Add markers based on arguments
    markers = []
    if args.unit:
        markers.append("unit")
    if args.integration:
        markers.append("integration")
    if args.auth:
        markers.append("auth")
    if args.models:
        markers.append("models")
    if args.services:
        markers.append("services")
    if args.api:
        markers.append("api")
    
    if markers:
        pytest_cmd.extend(["-m", " or ".join(markers)])
    
    # Add specific path if provided
    if args.path:
        pytest_cmd.append(args.path)
    else:
        pytest_cmd.append("tests/")
    
    # Set environment variables
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root)
    env["TESTING"] = "1"
    
    # Run tests
    print("="*50)
    print("Running E-commerce Backend Tests")
    print("="*50)
    
    result = subprocess.run(pytest_cmd, cwd=project_root, env=env)
    
    if result.returncode == 0:
        print("\\n" + "="*50)
        print("✅ All tests passed!")
        
        if args.coverage and args.html:
            print(f"📊 HTML coverage report generated in: {project_root}/htmlcov/index.html")
        if args.coverage and args.xml:
            print(f"📊 XML coverage report generated in: {project_root}/coverage.xml")
        
        print("="*50)
    else:
        print("\\n" + "="*50)
        print("❌ Some tests failed!")
        print("="*50)
    
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())