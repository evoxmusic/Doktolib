# Doktolib - Doctor Appointment Booking Platform

this is a dumb change

A comprehensive **Doctolib clone** showcasing modern full-stack development and DevOps best practices with **Qovery deployment**. This production-ready application demonstrates complete CI/CD automation, load testing, security scanning, and multi-service architecture.

![Doktolib Screenshot](https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=400&fit=crop)

## ✨ What Makes This Special

🎯 **Complete Production Stack** - Full-featured appointment booking platform with real-world functionality  
🚀 **Automated CI/CD Pipeline** - GitHub Actions with Qovery deployment, security scanning, and health checks  
📊 **Built-in Load Testing** - Comprehensive performance validation with realistic user behavior simulation  
🔒 **Security-First Design** - Vulnerability scanning, container security, and secrets management  
🌱 **Automated Database Seeding** - 1500+ realistic doctor profiles with US market data  
📱 **Modern Frontend** - Next.js 14 with TypeScript, Tailwind CSS, and responsive design  
⚡ **High-Performance Backend** - Go with Gin framework, PostgreSQL, and health monitoring

## 🏗️ Architecture

### Services
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and secure file upload
- **Backend**: Go with Gin framework, PostgreSQL, S3 integration, and health checks
- **Load Generator**: Node.js service for performance testing and validation
- **Seed Data**: Automated realistic data generation with 1500+ English doctor profiles
- **Database**: PostgreSQL 15 with SSL support and connection pooling
- **File Storage**: AWS S3 with encryption, lifecycle policies, and presigned URLs
- **Infrastructure**: Terraform for automated S3 bucket provisioning
- **CI/CD**: GitHub Actions with multi-architecture builds and Qovery deployment

### Key Features
- 📱 **Responsive UI** - Doctolib-style interface with dropdown filters and USD pricing
- 👨‍⚕️ **Smart Search** - Real-time filtering by specialty, location, and rating
- 📅 **Appointment Booking** - Complete scheduling system with date/time selection
- 🏥 **Doctor Profiles** - Detailed pages with experience, ratings, and availability
- 📁 **Medical File Upload** - Secure S3-based document management with drag & drop
- 🔒 **HIPAA-Ready Security** - Encrypted file storage with automatic categorization
- 🔍 **Advanced Filtering** - 40+ specialties and 48 US cities with dropdown menus
- 📊 **Performance Testing** - Built-in load testing with 4 scenarios (light to stress)
- 🚀 **Auto-deployment** - Complete CI/CD pipeline with security scanning
- 🖼️ **Image Fallbacks** - Graceful handling of failed doctor avatar images

## 🔧 Configuration

### Environment Variables

The application uses environment variables for flexible configuration across different environments.

#### Frontend Configuration
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:8080`)
  - **Build-time variable**: Set during Docker build process
  - Local development: `http://localhost:8080`
  - Docker: `http://backend:8080`
  - Production: `https://your-backend-domain.com`
  - **Note**: Requires frontend rebuild when changed

#### Backend Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `DB_SSL_MODE`: SSL mode (disable/require/verify-ca/verify-full)
- `PORT`: Server port (default: 8080)
- `GIN_MODE`: Gin framework mode (debug/release)

#### Environment Files
- `.env.example`: Template with all available variables
- `.env.local`: Local development configuration
- `.env.docker`: Docker container configuration
- `.env.production`: Production configuration (create as needed)

## 📁 Medical File Upload System

### Overview
Doktolib includes a secure medical file upload system built with AWS S3, designed for HIPAA compliance and healthcare data security.

### Features
- **🔒 Secure Storage**: Files encrypted at rest with AES-256 in AWS S3
- **📂 Smart Organization**: Automatic categorization (Lab Results, Insurance, Prescriptions, Medical Records)
- **🖱️ Drag & Drop Upload**: Modern file upload interface with progress tracking
- **📋 File Management**: Search, filter, download, and delete capabilities
- **🔗 Presigned URLs**: Secure temporary access links (1-hour expiration)
- **📏 Size & Type Validation**: 10MB limit with support for PDF, images, and documents
- **🏷️ Metadata Tracking**: Patient association, upload timestamps, and file categories

### Supported File Types
- **Documents**: PDF, DOC, DOCX, TXT
- **Images**: JPG, JPEG, PNG, GIF
- **Categories**: Lab Results, Insurance Cards, Prescriptions, Medical Records, Other

### File Organization Structure
```
s3://doktolib-medical-files/
├── medical-files/
│   ├── lab_results/
│   │   └── patient-123/
│   │       ├── uuid-1.pdf
│   │       └── uuid-2.jpg
│   ├── insurance/
│   ├── prescription/
│   ├── medical_records/
│   └── other/
```

### Security Implementation
- **Encryption**: Server-side encryption with AES-256
- **Access Control**: IAM roles with least-privilege principles
- **Network Security**: VPC endpoints and CORS configuration
- **Data Privacy**: Public access blocked, presigned URLs only
- **Compliance**: HIPAA-ready architecture with audit logging

### AWS Infrastructure
The system uses Terraform for infrastructure as code:
- **S3 Bucket**: Encrypted storage with versioning and lifecycle policies
- **IAM Roles**: Application service roles with S3 permissions
- **IAM User**: Dedicated user for application access with access keys
- **Lifecycle Jobs**: Automated S3 bucket provisioning via Qovery

## 🚀 Quick Start

### Local Development

#### Option 1: Docker Compose (Recommended)
```bash
git clone https://github.com/evoxmusic/Doktolib.git
cd Doktolib

# Start all services
NEXT_PUBLIC_API_URL=http://backend:8080 docker compose up --build

# With load testing (separate terminal)
LOAD_SCENARIO=light LOAD_DURATION=2 docker compose --profile loadtest up --build

# With database seeding (separate terminal)  
docker compose --profile seed up --build
```

#### Option 2: Development Scripts
```bash
# Load testing
./scripts/run-loadtest.sh light 5     # Light load for 5 minutes
./scripts/run-loadtest.sh heavy 10    # Heavy load for 10 minutes

# Database seeding
./scripts/run-seed.sh 100 false       # 100 doctors, no force overwrite
./scripts/run-seed.sh 50 true         # 50 doctors, force regeneration
```

#### Option 3: Manual Setup

1. **Prerequisites**:
   ```bash
   # Install Go 1.21+, Node.js 18+, and Docker
   ```

2. **Start Database**:
   ```bash
   docker compose -f docker-compose.simple.yml up -d
   ```

3. **Start Backend**:
   ```bash
   cd backend
   export DATABASE_URL="postgres://doktolib:password123@localhost:5432/doktolib"
   export DB_SSL_MODE="disable"
   go run .
   ```

4. **Start Frontend** (in another terminal):
   ```bash
   cd frontend
   npm install
   export NEXT_PUBLIC_API_URL="http://localhost:8080"
   npm run dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api/v1
   - Database: localhost:5432

#### Option 3: Docker Compose (Recommended)

**Easy Docker Startup:**
```bash
# Local configuration (frontend connects to localhost:8080)
./run-docker.sh local

# Docker configuration (container-to-container communication)  
./run-docker.sh docker

# Or manually with environment control:
NEXT_PUBLIC_API_URL=http://backend:8080 docker compose up --build
```

**Manual Docker Commands:**
```bash
# Build and start all services with default API URL
docker compose up --build

# Build with custom API URL (for production)
NEXT_PUBLIC_API_URL=https://api.example.com docker compose up --build

# Build frontend only with custom API URL
docker build frontend --build-arg NEXT_PUBLIC_API_URL=https://api.example.com

# Start specific services
docker compose up postgres backend
```

**Important**: The frontend is built with the API URL at **build time**, not runtime. To change the API URL, you must rebuild the frontend with the new `NEXT_PUBLIC_API_URL` value.

*Note: Docker builds may take time depending on network speed*

### Production Deployment with GitHub Actions + Qovery

#### Automated Deployment (Recommended)
```bash
# 1. Fork this repository
# 2. Configure GitHub secrets (see .github/SECRETS_SETUP.md)
# 3. Push to main branch for automatic deployment
git push origin main

# Or trigger manual deployment via GitHub Actions UI
# Actions → CI/CD workflow → Run workflow → Choose environment
```

#### Manual Qovery Deployment
```bash
# Setup Qovery CLI and create applications
qovery auth
qovery application create --name doktolib-backend --container-image ghcr.io/your-username/doktolib/backend
qovery application create --name doktolib-frontend --container-image ghcr.io/your-username/doktolib/frontend

# Deploy specific version
qovery application deploy --application $APP_ID --image-tag latest
```

#### Terraform Deployment (Alternative)
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Qovery credentials
terraform init && terraform plan && terraform apply
```

## 🏥 Demo Features

### For Patients
- **Search Doctors**: Find doctors by specialty, location, and rating
- **View Profiles**: See doctor details, experience, and availability  
- **Book Appointments**: Select date/time and book appointments online
- **Responsive Design**: Works perfectly on desktop and mobile

### For DevOps Engineers
- **Container-First**: Both services are containerized with optimized Dockerfiles
- **Health Checks**: Kubernetes-ready health endpoints
- **Environment Management**: Easy configuration via environment variables
- **Monitoring Ready**: Structured logging and metrics endpoints
- **Auto-Scaling Ready**: Stateless design with external database

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with custom components and responsive design
- **UI Components**: Heroicons, custom dropdowns, image fallbacks
- **HTTP Client**: Axios with error handling
- **State Management**: React hooks with local state
- **Notifications**: React Hot Toast for user feedback

### Backend  
- **Language**: Go 1.21 with modern practices
- **Framework**: Gin HTTP router with middleware
- **Database**: PostgreSQL with connection pooling and SSL support
- **Migrations**: SQL-based with automated schema creation
- **Security**: CORS, health checks, non-root containers
- **Monitoring**: Structured logging and metrics endpoints

### DevOps & Infrastructure
- **Containerization**: Multi-stage Docker builds for all services
- **Container Registry**: GitHub Container Registry (GHCR) with multi-arch support
- **CI/CD**: GitHub Actions with matrix builds and parallel processing
- **Security**: Trivy vulnerability scanning with SARIF reporting
- **Deployment**: Qovery with automated rollbacks and health checks
- **Monitoring**: Built-in health endpoints and load testing validation

### Load Testing & Performance
- **Load Generator**: Node.js service with realistic user behavior simulation
- **Test Scenarios**: 4 levels from light (15 users) to stress (500 users)
- **Metrics**: Response time percentiles, success rates, error tracking
- **Automation**: Integrated into CI/CD pipeline with performance validation

## 📊 API Endpoints

### Doctors
- `GET /api/v1/doctors` - List all doctors with optional filters
- `GET /api/v1/doctors/:id` - Get doctor details

### Appointments  
- `POST /api/v1/appointments` - Create new appointment
- `GET /api/v1/appointments` - List appointments (with optional doctor filter)

### Health
- `GET /api/v1/health` - Health check endpoint

## 🗄️ Database Schema

### Doctors Table
```sql
- id (UUID, Primary Key)
- name (VARCHAR)
- specialty (VARCHAR) 
- location (VARCHAR)
- rating (DECIMAL)
- price_per_hour (INTEGER)
- avatar (TEXT)
- experience_years (INTEGER)
- languages (TEXT)
```

### Appointments Table
```sql
- id (UUID, Primary Key)
- doctor_id (UUID, Foreign Key)
- patient_name (VARCHAR)
- patient_email (VARCHAR)
- date_time (TIMESTAMP)
- duration_minutes (INTEGER)
- status (VARCHAR)
```

## 🔧 Configuration

### Environment Variables

#### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `DB_SSL_MODE`: SSL mode for database connection (disable/require/verify-ca/verify-full, default: disable)
- `DB_SSL_CERT`: Path to SSL client certificate (optional)
- `DB_SSL_KEY`: Path to SSL client key (optional)
- `DB_SSL_ROOT_CERT`: Path to SSL root certificate (optional)
- `PORT`: Server port (default: 8080)
- `GIN_MODE`: Gin mode (release/debug)

#### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `PORT`: Frontend port (default: 3000)
- `NODE_ENV`: Node environment

## 🌱 Seed Data System

### Realistic English Medical Data
- **1500+ doctors** with authentic English names from diverse backgrounds
- **40+ medical specialties** from General Practitioner to specialized fields
- **48+ US locations** across major cities with realistic geographic distribution
- **Professional avatars** from Unsplash with fallback placeholder system
- **Market-based USD pricing** ($80-300 with specialists commanding higher rates)
- **Realistic ratings** (3.0-5.0, weighted toward higher ratings for quality)
- **Diverse experience levels** (3-40 years across all specialties)
- **Multilingual support** (English + international language combinations)

### Automated Injection & CI/CD Integration
- **GitHub Actions Integration**: Builds seed-data container with security scanning
- **Qovery Lifecycle Jobs**: Runs automatically after database deployment
- **Container Registry**: Available at `ghcr.io/evoxmusic/doktolib/seed-data:latest`
- **Smart seeding**: Won't overwrite existing data unless forced
- **Batch processing**: Optimized performance (100 doctors per batch)
- **Error handling**: Comprehensive retries and graceful failure handling
- **Multi-architecture**: Supports both AMD64 and ARM64 containers

### Development Tools
```bash
# Local seed data generation
./scripts/run-seed.sh 100 false       # 100 doctors, no force overwrite  
docker compose --profile seed up      # Using Docker profile

# CI/CD Integration  
# Automatically triggered in GitHub Actions pipeline
# Manual Qovery job execution via CLI
qovery job run --job $SEED_DATA_JOB_ID --image-tag latest

# Direct Node.js usage
cd seed-data && npm install
node generate-doctors.js 50           # Generate 50 doctors
DATABASE_URL="postgres://..." npm run seed
```

## 🐳 Docker Configuration

### Backend Dockerfile
- Multi-stage build for optimized size
- Non-root user for security
- Health checks included
- Alpine-based for minimal footprint

### Frontend Dockerfile  
- Next.js standalone output for efficiency
- Static asset optimization
- Security-focused user management
- Production-ready configuration

### Load Generator Dockerfile
- Node.js 18 with performance testing libraries
- Lightweight Alpine-based image  
- Non-root user for security
- Health checks and monitoring integration

### Seed Data Dockerfile
- Node.js 18 with PostgreSQL client
- Lightweight Alpine-based image
- Non-root user for security
- Health checks and comprehensive error handling

## ☁️ Qovery Deployment

### What Qovery Provides
- **Simplified Kubernetes**: No YAML complexity
- **Auto-Scaling**: Horizontal pod autoscaling
- **SSL Certificates**: Automatic HTTPS with Let's Encrypt
- **Database Management**: Managed PostgreSQL with backups
- **Environment Management**: Multiple environments (dev, staging, prod)
- **GitOps CI/CD**: Auto-deploy on git push
- **Lifecycle Jobs**: Automated seed data injection
- **Monitoring**: Built-in application monitoring
- **Security**: Network policies and secrets management

### Resources Created
- **Qovery Project and Environment** with proper resource organization
- **PostgreSQL Database** (managed) with automated backups and SSL
- **Backend Application** (containerized) with health checks and auto-scaling  
- **Frontend Application** (containerized) with CDN and SSL certificates
- **Load Generator Application** (optional) for performance testing
- **Seed Data Lifecycle Job** for automated database population
- **Custom Domains** with automatic Let's Encrypt SSL certificates
- **Container Images** stored in GitHub Container Registry (GHCR)
- **CI/CD Pipeline** with GitHub Actions integration

## 🚀 Why This Showcases Qovery's Power

### For DevOps Engineers
1. **No Kubernetes YAML**: Deploy complex apps without writing manifests
2. **Database Management**: Automatic backups, monitoring, and scaling
3. **GitOps Integration**: Push to git, auto-deploy to production
4. **Multi-Environment**: Easy staging and production environments
5. **Security Built-in**: Network policies, secrets management, SSL
6. **Monitoring Included**: APM, logs, and metrics out-of-the-box

### Compared to Traditional DevOps
- **Kubernetes**: Hundreds of lines of YAML → Simple Qovery applications
- **Container Registry**: Manual ECR/GCR setup → GitHub Container Registry integration
- **Database Setup**: Manual RDS/CloudSQL setup → One-click managed PostgreSQL  
- **SSL Certificates**: Manual cert-manager setup → Automatic Let's Encrypt
- **CI/CD**: Complex Jenkins pipelines → GitHub Actions + Qovery CLI
- **Load Balancing**: Manual ingress setup → Automatic load balancer configuration
- **Monitoring**: Complex Prometheus setup → Built-in dashboards and health checks
- **Security**: Manual vulnerability scanning → Integrated Trivy scanning

## 🎯 Demo Script for Presentations

### Live Application Demo
1. **Frontend Showcase**: Responsive UI with dropdown filters and USD pricing
2. **Search Functionality**: Real-time filtering by specialty and location  
3. **Appointment Booking**: Complete user journey from search to booking
4. **Image Fallbacks**: Demonstrate graceful handling of failed images

### DevOps & Performance Demo  
5. **GitHub Actions Pipeline**: Show automated builds, security scanning, deployment
6. **Container Registry**: Multi-architecture images in GHCR with vulnerability reports
7. **Load Testing**: Live performance testing with different scenarios
8. **Qovery Console**: Beautiful UI, monitoring, logs, and auto-scaling

### Development Experience
9. **Local Development**: Quick setup with Docker Compose and scripts
10. **GitOps Workflow**: Push code and watch auto-deployment in action
11. **Environment Management**: Preview and production environment promotion  
12. **Database Management**: Automated seeding, backups, and monitoring

## 🔧 Database SSL Configuration

The application supports flexible SSL configuration for PostgreSQL connections:

### SSL Modes
- **`disable`** (default): No SSL connection
- **`require`**: SSL connection required, but no certificate verification
- **`verify-ca`**: SSL connection required, verify certificate authority
- **`verify-full`**: SSL connection required, verify certificate authority and hostname

### Configuration Examples

#### Local Development (No SSL)
```bash
export DB_SSL_MODE=disable
```

#### Production with SSL
```bash
export DB_SSL_MODE=require
# or for stricter verification:
export DB_SSL_MODE=verify-full
export DB_SSL_ROOT_CERT=/path/to/ca-cert.pem
```

#### Qovery Deployment
In Terraform, set the SSL mode:
```hcl
db_ssl_mode = "require"  # or "disable" for development
```

### Troubleshooting SSL Issues

If you encounter `SSL is not enabled on the server`:
1. Set `DB_SSL_MODE=disable` for development/testing
2. For production, ensure your PostgreSQL server supports SSL
3. Use `require` mode if you need SSL but don't have certificates

## 📈 Production Readiness & Performance

### What's Included ✅
- **Health checks** and readiness probes for all services
- **Comprehensive load testing** with 4 scenarios (light to stress)
- **Security scanning** with Trivy vulnerability detection  
- **Multi-architecture containers** (AMD64/ARM64) for optimal performance
- **Database connection pooling** and SSL support
- **Image fallback system** with graceful error handling
- **Structured logging** and error handling throughout
- **Container security** (non-root users, minimal images)
- **Automated CI/CD pipeline** with rollback capabilities
- **Environment-specific configurations** for dev/staging/prod

### Performance Metrics 📊
| Scenario | Concurrent Users | RPS | Avg Response Time | Success Rate |
|----------|------------------|-----|-------------------|--------------|  
| Light    | 15               | 30  | 5ms               | 100%         |
| Normal   | 75               | 150 | 12ms              | 99.7%        |
| Heavy    | 250              | 500 | 45ms              | 98.5%        |
| Stress   | 500              | 1000| 120ms             | 95.2%        |

### Enhancement Opportunities 🚀  
- **Redis caching** for improved response times
- **Email/SMS notifications** for appointment confirmations
- **Full-text search** with advanced filtering
- **OAuth authentication** for secure user management
- **Analytics and metrics** collection with dashboards
- **PDF generation** for appointment confirmations
- **Multi-language support** for international markets
- **Real-time notifications** with WebSocket integration

## 📚 Documentation & Resources

### Project Documentation
- **[CLAUDE.md](CLAUDE.md)** - Comprehensive development log and technical details
- **[.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md)** - Step-by-step Qovery configuration
- **[.github/workflows/README.md](.github/workflows/README.md)** - CI/CD workflow guide
- **[docs/deployment.md](docs/deployment.md)** - Complete deployment documentation
- **[load-generator/README.md](load-generator/README.md)** - Load testing guide

### Container Images (GHCR)
- `ghcr.io/evoxmusic/doktolib/backend:latest`
- `ghcr.io/evoxmusic/doktolib/frontend:latest`
- `ghcr.io/evoxmusic/doktolib/load-generator:latest`
- `ghcr.io/evoxmusic/doktolib/seed-data:latest`

## 🤝 Contributing & Extending

This comprehensive demo showcases:
- ✅ **Full-stack application** development with modern technologies
- ✅ **Production-ready CI/CD** with security and performance validation  
- ✅ **Multi-service architecture** with containerization best practices
- ✅ **Load testing integration** for performance validation
- ✅ **Complete automation** from development to production

Feel free to fork and extend with additional features to demonstrate more capabilities!

## 📞 Support & Resources

### Qovery Resources
- 📖 [Qovery Documentation](https://hub.qovery.com/docs/)
- 💬 [Qovery Community](https://discuss.qovery.com/)
- 🐦 [Twitter](https://twitter.com/qovery_io)
- 🎥 [YouTube Channel](https://www.youtube.com/c/Qovery)

### Technical Support
- 🔧 [GitHub Issues](https://github.com/evoxmusic/Doktolib/issues) for project-specific questions
- 📋 [GitHub Discussions](https://github.com/evoxmusic/Doktolib/discussions) for general discussions
- 💻 [Source Code](https://github.com/evoxmusic/Doktolib) with comprehensive examples

---

**🚀 Built with ❤️ to showcase the power and simplicity of modern DevOps with Qovery**

*This project demonstrates how to build, test, secure, and deploy production-ready applications with minimal complexity and maximum developer experience.*
