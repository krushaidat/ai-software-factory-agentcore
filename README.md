# AI Software Factory

Interactive demo of AI-powered CI/CD for automotive embedded software, built by Storm Reply x AWS.

## Quick Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview   # preview production build locally
```

## Deploy to AWS

The infrastructure uses CloudFormation to provision an S3 bucket + CloudFront distribution.

### Manual Deployment

```bash
# Default (CloudFront URL only)
bash infra/deploy.sh

# With custom domain
bash infra/deploy.sh ai-software-factory us-east-1 factory.example.com Z0123456789 arn:aws:acm:us-east-1:123456789:certificate/abc-123
```

Arguments: `STACK_NAME REGION DOMAIN HOSTED_ZONE_ID CERT_ARN`

### GitHub Actions (CI/CD)

Add these secrets to your repository:

| Secret | Description |
|---|---|
| `AWS_ROLE_ARN` | IAM role ARN for OIDC federation |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `S3_BUCKET` | S3 bucket name (from stack outputs) |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID (from stack outputs) |

Pushes to `main` automatically build and deploy.

### Required AWS Permissions

The deploying principal needs: `cloudformation:*`, `s3:*`, `cloudfront:*`, `route53:ChangeResourceRecordSets` (if using custom domain), and `iam:CreateServiceLinkedRole`.

## Architecture

**Tech stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, React Router

**Project structure:**

```
src/
  components/   # Reusable UI components
  pages/        # Route-level page components
  context/      # React context providers
  hooks/        # Custom React hooks
  data/         # Static data and configuration
  config/       # App configuration
  types/        # TypeScript type definitions
  assets/       # Static assets
infra/          # AWS CloudFormation and deploy scripts
```

**Features:**
- AI-powered CI/CD pipeline visualization
- Real-time build and deployment monitoring dashboard
- Interactive pipeline configuration
- SPA with client-side routing
