# Deploying the Netflix clone on AWS — Docker Compose + VPC + ALB + Auto Scaling

## Where this sits

You've now seen three approaches:
1. **Fully managed containers** (ECS Fargate) — AWS runs the containers, you never touch a VM.
2. **Fully manual** (no Docker, systemd + nginx on EC2) — you control everything, most steps to repeat.
3. **This guide** — a middle ground: you still manage EC2 instances yourself (inside a VPC, behind an ALB, in an Auto Scaling Group), but each instance just runs `docker compose up` instead of manually installing Python/nginx/systemd for the app itself. You get Docker's packaging/consistency benefits without fully handing infrastructure control to ECS.

**Key advantage over the fully-manual guide**: redeploying no longer means rebuilding an AMI. Each instance pulls the latest container image from ECR at boot — so shipping a code update becomes "push a new image, tell the ASG to refresh," not "SSH in, rebuild the AMI, update the launch template."

---

## Architecture summary

- **VPC**: 2 public subnets (ALB) + 2 private subnets (EC2 instances + RDS), 2 AZs
- **Backend**: your existing `backend/Dockerfile` image, stored in **ECR**, run via `docker compose up` on EC2 instances in an **Auto Scaling Group**
- **Load balancing**: ALB → target group → EC2 instances on port 8000 (the container's port — no nginx needed, the ALB handles TLS/routing)
- **Database**: RDS MySQL, private subnet (unchanged from previous guides)
- **Secrets**: Parameter Store, fetched into a `.env` file at boot (unchanged from the ASG guide)
- **Frontend**: still S3 + CloudFront — a static build doesn't need a container running anywhere

---

## Step 1 — VPC, security groups, RDS

Identical to the previous ASG guide — skip ahead if you already have these:

1. VPC `netflix-clone-vpc`: 2 public + 2 private subnets, 2 AZs, 1 NAT gateway per AZ.
2. Security groups:
   - `netflix-alb-sg`: inbound 80/443 from `0.0.0.0/0`
   - `netflix-ec2-sg`: inbound 8000 from `netflix-alb-sg` only, inbound 22 from your IP only
   - `netflix-db-sg`: inbound 3306 from `netflix-ec2-sg` only
3. RDS MySQL (`netflix-clone-db`), private subnets, public access off, note the endpoint.

---

## Step 2 — Push the backend image to ECR

Same as the fully-managed guide — you already have the `Dockerfile`, no changes needed:

1. **ECR → Create repository** → `netflix-clone-backend` (private).
2. From your local machine:
   ```bash
   cd backend
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   docker build -t netflix-clone-backend .
   docker tag netflix-clone-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/netflix-clone-backend:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/netflix-clone-backend:latest
   ```

---

## Step 3 — Store secrets in Parameter Store

Same as the ASG guide:

1. **Systems Manager → Parameter Store**, create:
   - `/netflix-clone/MYSQL_HOST`, `/netflix-clone/MYSQL_PORT`, `/netflix-clone/MYSQL_USER`
   - `/netflix-clone/MYSQL_PASSWORD` (SecureString)
   - `/netflix-clone/MYSQL_DB`
   - `/netflix-clone/JWT_SECRET` (SecureString)
2. Create IAM role `netflix-ec2-role` with:
   - `ssm:GetParameter` on `arn:aws:ssm:*:*:parameter/netflix-clone/*`, plus `kms:Decrypt`
   - **`AmazonEC2ContainerRegistryReadOnly`** managed policy attached too (new requirement here — instances need to pull from ECR)

---

## Step 4 — Build the golden EC2 instance (Docker instead of Python)

1. Launch a temporary `t3.small` Ubuntu 24.04 instance in a public subnet (same as before, for easy SSH access while building).
2. SSH in and install Docker + Compose:
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker ubuntu
   sudo apt install -y awscli
   ```
   Log out and back in for the group change to apply, or run `newgrp docker`.
3. Create the app directory and a **trimmed-down compose file** — just the backend, no MySQL (RDS replaces it) and no frontend (S3/CloudFront replaces it):
   ```bash
   mkdir -p /home/ubuntu/app && cd /home/ubuntu/app
   nano docker-compose.yml
   ```
   ```yaml
   services:
     backend:
       image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/netflix-clone-backend:latest
       restart: unless-stopped
       ports:
         - "8000:8000"
       env_file: .env
   ```
4. Verify Docker itself works (you'll test the full pull-and-run flow via the boot script next):
   ```bash
   docker run hello-world
   ```

---

## Step 5 — Boot-time script: fetch secrets, log in to ECR, start Compose

This replaces the systemd/nginx setup from the fully-manual guide. It runs on every boot, so the same AMI works for every instance the ASG launches — and every reboot re-pulls whatever image tag is currently in `docker-compose.yml`.

```bash
sudo nano /usr/local/bin/start-app.sh
```

```bash
#!/bin/bash
set -e
REGION="us-east-1"
ACCOUNT_ID="<account-id>"
APP_DIR="/home/ubuntu/app"
ENV_FILE="$APP_DIR/.env"

get_param() {
  aws ssm get-parameter --name "/netflix-clone/$1" --with-decryption --region "$REGION" --query 'Parameter.Value' --output text
}

cat > "$ENV_FILE" <<EOF
MYSQL_HOST=$(get_param MYSQL_HOST)
MYSQL_PORT=$(get_param MYSQL_PORT)
MYSQL_USER=$(get_param MYSQL_USER)
MYSQL_PASSWORD=$(get_param MYSQL_PASSWORD)
MYSQL_DB=$(get_param MYSQL_DB)
JWT_SECRET=$(get_param JWT_SECRET)
EOF
chown ubuntu:ubuntu "$ENV_FILE"
chmod 600 "$ENV_FILE"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

cd "$APP_DIR"
docker compose pull
docker compose up -d
```

```bash
sudo chmod +x /usr/local/bin/start-app.sh
```

Wire it to run at boot:
```bash
sudo nano /etc/systemd/system/app-start.service
```
```ini
[Unit]
Description=Pull and start the backend via Docker Compose
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=true
ExecStart=/usr/local/bin/start-app.sh

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable app-start.service
```

Test it manually before capturing the AMI:
```bash
sudo systemctl start app-start.service
docker ps                      # confirm the container is running
curl localhost:8000/api/       # confirm the app responds
```

---

## Step 6 — Create the AMI

```bash
sudo docker compose -f /home/ubuntu/app/docker-compose.yml down
rm -f /home/ubuntu/app/.env
history -c
```

**EC2 console → select the instance → Actions → Image and templates → Create image** → name it `netflix-backend-compose-ami-v1`. Wait for "Available", then terminate (or stop and keep as your build box).

---

## Step 7 — Launch Template, Target Group, ALB, Auto Scaling Group

All identical to the previous ASG guide, with two small differences:

- **Launch Template**: AMI = `netflix-backend-compose-ami-v1`, IAM instance profile = `netflix-ec2-role` (now includes ECR read access from Step 3).
- **Target group**: port **8000** directly (not 80 — there's no nginx in front this time; the container publishes 8000 straight to the host, and the ALB talks to it directly). Health check path: `/api/`.

Steps, condensed (see the earlier ASG guide for full detail on each):
1. Target group `netflix-backend-tg`: HTTP/8000, health check `/api/`.
2. ALB `netflix-clone-alb`: public subnets, `netflix-alb-sg`, listener HTTP:80 → `netflix-backend-tg`.
3. Launch template `netflix-backend-lt`: AMI from Step 6, `t3.small`, `netflix-ec2-sg`, IAM profile `netflix-ec2-role`.
4. ASG `netflix-backend-asg`: private subnets, attached to `netflix-backend-tg`, ELB health checks, desired 2 / min 2 / max 4, target-tracking scaling policy on CPU at 50%.
5. Confirm: `http://<alb-dns-name>/api/` returns the expected JSON once instances pass health checks.

---

## Step 8 — Frontend and domain (unchanged)

Same as every previous guide — S3 + CloudFront for the static build, Route 53 + ACM for the domain and HTTPS on both the CloudFront distribution and the ALB's HTTPS:443 listener.

---

## Step 9 — Rolling out a code update (the payoff of using Compose here)

This is meaningfully simpler than the fully-manual AMI approach, because the AMI itself never needs to change for a code update — only the image in ECR does.

1. Build and push a new image:
   ```bash
   cd backend
   docker build -t netflix-clone-backend .
   docker tag netflix-clone-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/netflix-clone-backend:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/netflix-clone-backend:latest
   ```
2. **EC2 → Auto Scaling Groups → `netflix-backend-asg` → Instance refresh → Start instance refresh.**
   - New instances launch from the *same* AMI, but since `start-app.sh` runs `docker compose pull` at every boot, they come up running the image you just pushed.
   - Old instances are drained and terminated as new ones pass health checks — a rolling deploy with no AMI rebuild required.

If you tag images by git commit SHA instead of always `:latest` (recommended once this matters for real), update the tag in `docker-compose.yml` on your golden instance and rebuild the AMI only when you want to pin a specific version — otherwise `:latest` plus instance refresh is enough for a personal project.

---

## Alternative worth knowing about: Docker's native ECS integration

If you'd rather skip building AMIs and managing EC2 entirely, Docker ships a built-in ECS context that turns your `docker-compose.yml` directly into ECS/Fargate resources:

```bash
docker context create ecs myecscontext
docker context use myecscontext
docker compose up
```

This reads your compose file and provisions the ALB, Fargate tasks, security groups, and networking automatically via CloudFormation — genuinely just `docker compose up`, no manual AMI/ASG work at all. It's less configurable than doing it by hand (harder to fine-tune scaling policies, health checks, etc.), but worth trying if the EC2-based approach above feels like more infrastructure than you want to own. The fully-managed ECS Fargate guide from earlier is the manual version of what this command does under the hood.

---

## Rough monthly cost

Same as the manual VPC/ALB/ASG guide — this swaps *how* the app runs on each instance, not the surrounding infrastructure:

| Service | Approx. cost |
|---|---|
| RDS db.t3.micro | ~$13 |
| EC2 t3.small × 2 | ~$30 |
| Application Load Balancer | ~$16 + data |
| NAT Gateway × 2 | ~$64 + data |
| S3 + CloudFront | ~$1–5 |
| ECR storage | ~$0.10/GB (negligible at this scale) |
| **Total (steady state)** | **~$125–130/month** |
