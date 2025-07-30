#!/usr/bin/env python3
"""Simple test runner for basic tests."""

import os
import sys
import subprocess
from pathlib import Path


def main():
    """Run basic tests."""
    project_root = Path(__file__).parent
    
    # Set environment variables
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root)
    env["TESTING"] = "1"
    
    # Check if pytest is available
    try:
        subprocess.run([sys.executable, "-m", "pytest", "--version"], 
                      check=True, capture_output=True)
        pytest_available = True
    except (subprocess.CalledProcessError, FileNotFoundError):
        pytest_available = False
    
    if pytest_available:
        print("="*50)
        print("Running tests with pytest")
        print("="*50)
        
        # Run basic tests
        cmd = [
            sys.executable, "-m", "pytest", 
            "tests/test_basic.py",
            "-v",
            "--tb=short",
            "-x"  # Stop on first failure
        ]
        
        result = subprocess.run(cmd, env=env, cwd=project_root)
        
        if result.returncode == 0:
            print("\\n" + "="*50)
            print("All basic tests passed!")
            print("="*50)
        else:
            print("\\n" + "="*50)
            print("Some tests failed!")
            print("="*50)
        
        return result.returncode
    
    else:
        print("="*50)
        print("Running tests without pytest (basic mode)")
        print("="*50)
        
        # Import and run tests manually
        sys.path.insert(0, str(project_root))
        
        try:
            # Import the test module
            import tests.test_basic as test_module
            
            # Run basic function tests
            test_functions = [
                test_module.test_simple_math,
                test_module.test_string_operations,
                test_module.test_list_operations,
                test_module.test_dictionary_operations,
            ]
            
            passed = 0
            failed = 0
            
            for test_func in test_functions:
                try:
                    test_func()
                    print(f"PASS {test_func.__name__}")
                    passed += 1
                except Exception as e:
                    print(f"FAIL {test_func.__name__}: {e}")
                    failed += 1
            
            # Run class-based tests
            test_classes = [
                test_module.TestPasswordValidation,
                test_module.TestEmailValidation,
                test_module.TestMockingExamples,
                test_module.TestEdgeCases,
            ]
            
            for test_class in test_classes:
                instance = test_class()
                methods = [method for method in dir(instance) 
                          if method.startswith('test_') and callable(getattr(instance, method))]
                
                for method_name in methods:
                    try:
                        method = getattr(instance, method_name)
                        method()
                        print(f"PASS {test_class.__name__}.{method_name}")
                        passed += 1
                    except Exception as e:
                        print(f"FAIL {test_class.__name__}.{method_name}: {e}")
                        failed += 1
            
            print("\\n" + "="*50)
            print(f"Results: {passed} passed, {failed} failed")
            
            if failed == 0:
                print("All basic tests passed!")
            else:
                print("Some tests failed!")
            print("="*50)
            
            return 1 if failed > 0 else 0
            
        except ImportError as e:
            print(f"Could not import test module: {e}")
            print("\\nTry installing test dependencies:")
            print("pip install pytest pytest-asyncio pytest-mock")
            return 1


if __name__ == "__main__":
    sys.exit(main())