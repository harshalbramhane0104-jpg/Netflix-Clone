# Deploying the Netflix clone on AWS — manual EC2, VPC, ALB, Auto Scaling

## Architecture summary

- **VPC**: 2 public subnets (ALB) + 2 private subnets (EC2 instances + RDS) across 2 Availability Zones
- **Backend**: FastAPI running directly via uvicorn/systemd/nginx (no Docker) on EC2 instances in an **Auto Scaling Group**, launched from a custom **AMI** you build once
- **Load balancing**: **Application Load Balancer** in the public subnets, routing to the ASG's target group
- **Database**: RDS MySQL in a private subnet
- **Frontend**: S3 + CloudFront (unchanged from before — a static build doesn't need any of this)
- **Domain/TLS**: Route 53 + ACM

The key difference from a single-instance setup: instead of manually configuring one EC2 box and SSHing in to redeploy, you configure it **once**, capture that as an AMI, and let Auto Scaling launch (and replace) instances from that image. Code updates become "build a new AMI version, tell the ASG to roll out to it" rather than SSH + restart on a live box.

---

## Step 1 — Set up the VPC

1. **VPC → Create VPC** → "VPC and more".
   - Name: `netflix-clone-vpc`
   - IPv4 CIDR: `10.0.0.0/16`
   - Availability Zones: **2** (needed for the ALB and for ASG redundancy)
   - Public subnets: 2 (`10.0.0.0/24`, `10.0.1.0/24`) — for the ALB
   - Private subnets: 2 (`10.0.2.0/24`, `10.0.3.0/24`) — for EC2 instances and RDS
   - NAT gateways: **1 per AZ** (needed now — private-subnet EC2 instances need outbound internet to reach the TMDB API, install packages, etc., but shouldn't be directly reachable from the internet)
2. Create it.

This is a step up in cost from the single-instance guide (NAT gateways aren't free), but it's what makes "instances in private subnets, only reachable via the ALB" possible.

---

## Step 2 — Create the RDS MySQL database

Same as the previous guides.

1. **RDS → Create database** → MySQL 8.x, Dev/Test template.
2. Identifier: `netflix-clone-db`, master username `admin`, auto-generate password.
3. Instance size: `db.t3.micro` to start.
4. Connectivity: VPC `netflix-clone-vpc`, subnet group using the **private** subnets, **Public access: No**.
5. Security group: create new, `netflix-db-sg`.
6. Initial database name: `netflix_clone`.
7. Create, wait for "Available", note the endpoint.

You'll create the `netflix_app` MySQL user once your first EC2 instance is up (Step 4).

---

## Step 3 — Security groups

Create these up front so you can reference them everywhere else:

- **`netflix-alb-sg`**: inbound 80 and 443 from `0.0.0.0/0`. Outbound: all.
- **`netflix-ec2-sg`**: inbound 80 from `netflix-alb-sg` only (not the internet — traffic only arrives via the ALB). Also inbound 22 from **your IP only**, for occasional debugging SSH access via a bastion or Session Manager. Outbound: all (needed for apt installs, TMDB API calls).
- **`netflix-db-sg`**: inbound 3306 from `netflix-ec2-sg` only. Outbound: all.

Chain: internet → ALB → EC2 (private subnet) → RDS (private subnet). Nothing but the ALB is ever internet-facing.

---

## Step 4 — Build and configure the "golden" EC2 instance

This is a one-time setup instance you'll turn into an AMI, then terminate (or keep around as your update/staging box).

1. **EC2 → Launch instance**. Name: `netflix-backend-golden`. AMI: **Ubuntu Server 24.04 LTS**. Type: `t3.small`.
2. Network: `netflix-clone-vpc`, a **public** subnet temporarily (easier to SSH into directly while building it — you'll launch the real ASG instances into private subnets), auto-assign public IP: enable.
3. Security group: temporarily attach one allowing SSH from your IP (you can reuse `netflix-ec2-sg` plus a temporary SSH rule, or a separate `netflix-golden-sg` you delete later).
4. Launch, then SSH in:
   ```bash
   ssh -i your-key.pem ubuntu@<public-ip>
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y python3-pip python3-venv nginx git mysql-client
   ```
5. Get your backend code onto it (git clone, or `scp` from local), then:
   ```bash
   cd /home/ubuntu/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
6. Create `.env` — but **leave the DB password blank for now**; you'll inject real secrets at boot time via user data (Step 6), not bake them into the AMI. For now just verify the app runs:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8000
   ```
   Confirm you get a response, then `Ctrl+C`.
7. Set up the systemd service (same as the single-instance guide):
   ```bash
   sudo nano /etc/systemd/system/netflix-backend.service
   ```
   ```ini
   [Unit]
   Description=Netflix clone FastAPI backend
   After=network.target

   [Service]
   User=ubuntu
   WorkingDirectory=/home/ubuntu/backend
   EnvironmentFile=/home/ubuntu/backend/.env
   ExecStart=/home/ubuntu/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000 --workers 2
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable netflix-backend
   ```
   (Don't start it yet — no real `.env` values exist on this golden image.)
8. Set up nginx as a reverse proxy:
   ```bash
   sudo nano /etc/nginx/sites-available/netflix-backend
   ```
   ```nginx
   server {
       listen 80;
       server_name _;
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       # ALB health check target
       location /api/ {
           proxy_pass http://127.0.0.1:8000/api/;
       }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/netflix-backend /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```
9. Empty out the placeholder `.env` file (real values get written by user data at instance launch):
   ```bash
   rm /home/ubuntu/backend/.env
   ```

---

## Step 5 — Store real secrets in Parameter Store

Rather than baking DB credentials into the AMI (bad — anyone who gets the AMI gets your DB password), store them in **Systems Manager Parameter Store** and have each instance fetch them at boot.

1. **Systems Manager → Parameter Store → Create parameter** for each of:
   - `/netflix-clone/MYSQL_HOST` (String)
   - `/netflix-clone/MYSQL_PORT` → `3306`
   - `/netflix-clone/MYSQL_USER` → `netflix_app`
   - `/netflix-clone/MYSQL_PASSWORD` → **SecureString**, the password from Step 2
   - `/netflix-clone/MYSQL_DB` → `netflix_clone`
   - `/netflix-clone/JWT_SECRET` → **SecureString**, generate with `openssl rand -hex 32`
2. Create an **IAM role** `netflix-ec2-role` with a policy allowing `ssm:GetParameter` on `arn:aws:ssm:*:*:parameter/netflix-clone/*` and `kms:Decrypt` (for SecureStrings). You'll attach this role to the Launch Template in Step 7 — it's how instances are allowed to read these values without any credentials hardcoded anywhere.

While you have the golden instance up, also connect to RDS and create the app user (same as before):
```bash
mysql -h <rds-endpoint> -u admin -p
```
```sql
CREATE USER 'netflix_app'@'%' IDENTIFIED BY '<the password you stored above>';
GRANT ALL PRIVILEGES ON netflix_clone.* TO 'netflix_app'@'%';
FLUSH PRIVILEGES;
```

---

## Step 6 — Add a boot-time script that pulls secrets and starts the app

This is the piece that makes the golden AMI reusable across many instances without secrets baked in. Add this script to the golden instance so it runs on every boot (including brand-new instances launched from the AMI):

```bash
sudo nano /usr/local/bin/fetch-env-and-start.sh
```

```bash
#!/bin/bash
set -e
REGION="us-east-1"
ENV_FILE="/home/ubuntu/backend/.env"

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
systemctl restart netflix-backend
```

```bash
sudo chmod +x /usr/local/bin/fetch-env-and-start.sh
```

Wire it to run on every boot via a systemd unit (runs before the app service starts):
```bash
sudo nano /etc/systemd/system/fetch-env.service
```
```ini
[Unit]
Description=Fetch environment from Parameter Store
Before=netflix-backend.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/fetch-env-and-start.sh

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable fetch-env.service
```
Also install the AWS CLI if it isn't already present: `sudo apt install -y awscli`.

---

## Step 7 — Create the AMI

1. Stop services cleanly and clear instance-specific state before capturing:
   ```bash
   sudo systemctl stop netflix-backend
   sudo rm -f /home/ubuntu/backend/.env
   history -c
   ```
2. **EC2 console → select the golden instance → Actions → Image and templates → Create image**.
3. Name: `netflix-backend-ami-v1`. No reboot needed for a clean app-only capture (leave "No reboot" unchecked for safety — a quick reboot ensures a consistent filesystem state).
4. Wait for the AMI status to become "Available" (a few minutes).
5. You can now terminate the golden instance, or keep it around (stopped) as your base for building future AMI versions when you update code.

---

## Step 8 — Create a Launch Template

1. **EC2 → Launch Templates → Create launch template**.
2. Name: `netflix-backend-lt`.
3. AMI: select `netflix-backend-ami-v1`.
4. Instance type: `t3.small`.
5. Key pair: your existing one (for occasional debugging).
6. Security groups: `netflix-ec2-sg`.
7. **Advanced details → IAM instance profile**: select `netflix-ec2-role` (from Step 5) — this is what lets each launched instance read Parameter Store.
8. Leave user data empty (the fetch-env logic already runs via the systemd unit baked into the AMI).
9. Create the template.

---

## Step 9 — Create the target group and ALB

1. **EC2 → Target Groups → Create target group**.
   - Target type: **Instances**
   - Name: `netflix-backend-tg`
   - Protocol/port: HTTP / 80 (nginx's port — not 8000, since nginx is what's actually listening publicly on each instance now)
   - VPC: `netflix-clone-vpc`
   - Health check path: `/api/`
2. **EC2 → Load Balancers → Create → Application Load Balancer**.
   - Name: `netflix-clone-alb`, scheme: internet-facing
   - VPC: `netflix-clone-vpc`, subnets: the two **public** subnets
   - Security group: `netflix-alb-sg`
   - Listener: HTTP:80 → forward to `netflix-backend-tg` (add HTTPS:443 later once you have an ACM cert, per Step 12)
3. Create it — takes a couple minutes to provision.

---

## Step 10 — Create the Auto Scaling Group

1. **EC2 → Auto Scaling Groups → Create Auto Scaling group**.
2. Name: `netflix-backend-asg`.
3. Launch template: `netflix-backend-lt`.
4. VPC: `netflix-clone-vpc`, subnets: the two **private** subnets.
5. Load balancing: attach to existing target group → `netflix-backend-tg`.
6. Health checks: enable **ELB health checks** (not just EC2 status checks — this way the ASG replaces an instance if the app itself is unhealthy, not just if the VM is down), health check grace period: 60s.
7. Group size:
   - Desired capacity: 2
   - Minimum: 2
   - Maximum: 4 (or higher — this is your ceiling)
8. **Scaling policies**: add a **target tracking** policy — metric: Average CPU Utilization, target value: 50%. The ASG will add instances when average CPU crosses 50% and remove them when it drops back down.
9. Create the group. Watch **EC2 → Instances** — you should see 2 new instances launch automatically from the AMI, register with the target group, and pass health checks within a couple minutes.
10. Test: hit `http://<alb-dns-name>/api/` — should return `{"message": "Netflix Clone API"}`.

---

## Step 11 — Frontend: S3 + CloudFront (unchanged)

Identical to the earlier guides — a static build doesn't care how the backend is hosted.

```bash
cd frontend
REACT_APP_BACKEND_URL=https://api.yourdomain.com npm run build
aws s3 sync build/ s3://netflix-clone-frontend-yourname --delete
```

Set up the S3 bucket + CloudFront distribution with OAC and the 403/404 → `/index.html` rewrite rule as described in the previous guides, if you haven't already.

---

## Step 12 — Domain + HTTPS

1. **Route 53**: register or import your domain.
2. **ACM**: request a certificate for `yourdomain.com` (`us-east-1`, for CloudFront) — DNS validate.
3. **Also request a regional certificate** for `api.yourdomain.com` in whichever region your ALB lives in (ACM certs for ALBs are regional, unlike CloudFront's which must be `us-east-1`).
4. Attach the CloudFront cert to your distribution (Alternate domain name → `yourdomain.com`).
5. Attach the ALB cert: **EC2 → Load Balancers → your ALB → Listeners → Add listener** → HTTPS:443 → select the regional cert → forward to `netflix-backend-tg`. Optionally add a redirect rule on the HTTP:80 listener to force HTTPS.
6. **Route 53** records:
   - A (alias): `yourdomain.com` → CloudFront distribution
   - A (alias): `api.yourdomain.com` → the ALB

---

## Step 13 — Rolling out a code update

This is the part that's different from the single-instance guide — you don't SSH into live instances anymore.

1. Start (or resume) your golden instance.
2. Pull the latest code, reinstall dependencies if `requirements.txt` changed:
   ```bash
   cd /home/ubuntu/backend
   git pull   # or scp the updated files over
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Clean up state again and create a new AMI version:
   ```bash
   sudo systemctl stop netflix-backend
   sudo rm -f /home/ubuntu/backend/.env
   ```
   **EC2 → Actions → Create image** → name it `netflix-backend-ami-v2`.
4. **EC2 → Launch Templates → `netflix-backend-lt` → Create new version**, pointing at `netflix-backend-ami-v2`. Set it as the default version.
5. **EC2 → Auto Scaling Groups → `netflix-backend-asg` → Instance refresh → Start instance refresh**.
   - This gradually replaces old instances with new ones launched from the updated template, respecting a minimum healthy percentage (e.g. 50–100%) so the ALB always has healthy targets to route to — effectively a rolling deploy with no downtime.
6. Watch the refresh progress in the ASG console; it finishes once every instance has been cycled.

If you do this often enough that it feels tedious, that's the natural point to introduce a small script (or GitHub Actions workflow calling the AWS CLI) that automates steps 3–5 — still no Docker involved, just automating the AMI-and-refresh cycle you just did by hand.

---

## Rough monthly cost (small/dev scale, min 2 / max 4 instances)

| Service | Approx. cost |
|---|---|
| RDS db.t3.micro | ~$13 |
| EC2 t3.small × 2 (steady state) | ~$30 |
| Application Load Balancer | ~$16 + data |
| NAT Gateway × 2 (one per AZ) | ~$64 + data |
| S3 + CloudFront | ~$1–5 at low traffic |
| Route 53 hosted zone | $0.50 |
| **Total (steady state)** | **~$125–130/month** |

The two NAT gateways are the biggest jump from the single-instance guide — they're what let private-subnet instances reach the internet (package installs, TMDB API calls) without being reachable from it. If cost is a bigger concern than resilience, a single NAT gateway (instead of one per AZ) cuts this roughly in half at the cost of a single point of failure for outbound traffic — the ALB and ASG's multi-AZ redundancy for inbound traffic is unaffected either way.

---

## What this buys you over the single-instance guide

- **No single point of failure** — 2+ instances across 2 AZs; if one instance or one whole AZ has a problem, the others keep serving traffic.
- **Auto scaling** — handles traffic spikes automatically instead of you manually resizing an instance.
- **Rolling deploys** — instance refresh replaces old code with new gradually, without a `systemctl restart` blip on live traffic.
- **Still no Docker** — every instance is still just Ubuntu + systemd + nginx + uvicorn, exactly like your local setup, just automated via AMI + Launch Template instead of manual SSH.
