#!/usr/bin/env python3
"""Debug script to find factory field mismatches."""

import sys
sys.path.append('.')

from app.models import *
from tests.fixtures.factories import *
import inspect

def check_factory_fields():
    """Check for field mismatches between factories and models."""
    
    factory_model_pairs = [
        (OrderFactory, Order),
        (OrderItemFactory, OrderItem),
        (PaymentFactory, Payment),
        (InventoryFactory, Inventory),
        (CouponFactory, Coupon),
    ]
    
    for factory, model in factory_model_pairs:
        print(f"\n=== Checking {factory.__name__} vs {model.__name__} ===")
        
        # Get factory fields
        factory_fields = set()
        for name, value in inspect.getmembers(factory):
            if not name.startswith('_') and not callable(value) and name not in ['Meta']:
                factory_fields.add(name)
        
        # Get model fields
        model_fields = set()
        if hasattr(model, '__table__'):
            for column in model.__table__.columns:
                model_fields.add(column.name)
        
        print(f"Factory fields: {sorted(factory_fields)}")
        print(f"Model fields: {sorted(model_fields)}")
        
        # Find mismatches
        factory_only = factory_fields - model_fields
        model_only = model_fields - factory_fields
        
        if factory_only:
            print(f"❌ Fields in factory but not model: {sorted(factory_only)}")
        if model_only:
            print(f"⚠️  Fields in model but not factory: {sorted(model_only)}")
        
        if not factory_only and not model_only:
            print("✅ No field mismatches found")

if __name__ == "__main__":
    check_factory_fields()