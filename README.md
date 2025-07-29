# E-commerce Backend API

A modern, scalable e-commerce backend built with FastAPI, SQLAlchemy 2.0, and PostgreSQL.

## Features

- **FastAPI** with async/await support
- **SQLAlchemy 2.0** with async database operations
- **Neon PostgreSQL** support
- **Alembic** for database migrations
- **Pydantic v2** for data validation
- **JWT Authentication** with secure password hashing
- **Docker** support for local development
- **Pre-commit hooks** for code quality
- **Modern Python 3.11+** with type hints

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── api_v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py          # Authentication endpoints
│   │   │   │   ├── users.py         # User management
│   │   │   │   ├── products.py      # Product catalog
│   │   │   │   └── orders.py        # Order management
│   │   │   └── api.py               # API router
│   │   └── dependencies.py          # Dependency injection
│   ├── core/
│   │   ├── config.py                # Configuration settings
│   │   ├── database.py              # Database connection
│   │   └── security.py              # Authentication & security
│   ├── crud/
│   │   ├── base.py                  # Base CRUD operations
│   │   ├── crud_user.py             # User CRUD
│   │   ├── crud_product.py          # Product CRUD
│   │   └── crud_order.py            # Order CRUD
│   ├── models/
│   │   ├── user.py                  # User database model
│   │   ├── product.py               # Product & Category models
│   │   └── order.py                 # Order & OrderItem models
│   ├── schemas/
│   │   ├── user.py                  # User Pydantic schemas
│   │   ├── product.py               # Product Pydantic schemas
│   │   ├── order.py                 # Order Pydantic schemas
│   │   └── auth.py                  # Authentication schemas
│   └── main.py                      # FastAPI application
├── alembic/                         # Database migrations
├── tests/                           # Test files
├── docker-compose.yml               # Docker configuration
├── Dockerfile                       # Docker image
├── requirements.txt                 # Python dependencies
└── .env.example                     # Environment variables template
```

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL (or use Docker)
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ecommerce-backend
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# For Neon PostgreSQL, use:
# DATABASE_URL=postgresql+asyncpg://username:password@your-neon-host/dbname
```

### 3. Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\\Scripts\\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Database Setup

```bash
# Generate initial migration
alembic revision --autogenerate -m "Initial migration"

# Run migrations
alembic upgrade head
```

### 5. Run the Application

```bash
# Development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc

## Docker Development

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Database Operations with Docker

```bash
# Run migrations in container
docker-compose exec web alembic upgrade head

# Create new migration
docker-compose exec web alembic revision --autogenerate -m "Migration name"
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users/` - List users (admin only)
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/{user_id}` - Get user
- `PUT /api/v1/users/{user_id}` - Update user

### Products
- `GET /api/v1/products/` - List products
- `POST /api/v1/products/` - Create product (admin only)
- `GET /api/v1/products/{product_id}` - Get product
- `PUT /api/v1/products/{product_id}` - Update product (admin only)
- `DELETE /api/v1/products/{product_id}` - Delete product (admin only)
- `GET /api/v1/products/categories/` - List categories
- `POST /api/v1/products/categories/` - Create category (admin only)

### Orders
- `GET /api/v1/orders/` - List orders
- `POST /api/v1/orders/` - Create order
- `GET /api/v1/orders/{order_id}` - Get order
- `PUT /api/v1/orders/{order_id}` - Update order

## Development

### Code Quality

```bash
# Install pre-commit hooks
pre-commit install

# Run pre-commit on all files
pre-commit run --all-files

# Manual code formatting
black .
isort .
flake8 .
```

### Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=app tests/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# View migration history
alembic history
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SECRET_KEY` | JWT secret key | Required |
| `ALGORITHM` | JWT algorithm | HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration | 30 |
| `ENVIRONMENT` | Environment name | development |
| `DEBUG` | Debug mode | True |

### Neon PostgreSQL Setup

1. Create account at [Neon](https://neon.tech)
2. Create new project and database
3. Copy connection string to `.env`:
   ```
   DATABASE_URL=postgresql+asyncpg://username:password@your-neon-host/dbname
   ```

## Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` to a secure random string
- [ ] Set `DEBUG=False`
- [ ] Configure proper CORS origins
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS
- [ ] Set up proper logging
- [ ] Configure database connection pooling

### Example Production Settings

```bash
# .env.production
DATABASE_URL=postgresql+asyncpg://user:pass@prod-host/db
SECRET_KEY=your-super-secure-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
DEBUG=False
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Development Setup

```bash
# Install development dependencies
pip install -r requirements.txt
pre-commit install

# Make your changes
# ...

# Run quality checks
pre-commit run --all-files
pytest
```

## License

This project is licensed under the MIT License.

## Support

For questions and support, please open an issue in the GitHub repository.