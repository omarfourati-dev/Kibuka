# Deployment: k3d (Local Kubernetes)

k3d runs a k3s Kubernetes cluster inside Docker containers. Use this to test Kubernetes manifests locally before deploying to a real cluster.

---

## Prerequisites

- Docker Engine 24+
- [k3d](https://k3d.io/) — `brew install k3d` or see https://k3d.io/#installation
- [kubectl](https://kubernetes.io/docs/tasks/tools/) — `brew install kubectl`
- [Helm](https://helm.sh/) (optional, for some addons)

Verify:

```bash
k3d version
kubectl version --client
docker version
```

---

## Step 1: Create the Cluster

```bash
chmod +x deploy/k3d/setup.sh
./deploy/k3d/setup.sh
```

This script:

1. Creates a k3d cluster named `myapp-local` with:
   - 1 server node
   - 2 agent nodes
   - Port 80 and 443 mapped to localhost:8080 and localhost:8443
   - A local image registry at `localhost:5000`
2. Installs the NGINX Ingress Controller
3. Configures `kubectl` context to point to the new cluster

Verify the cluster is running:

```bash
kubectl get nodes
# Should show 3 nodes in Ready state
```

---

## Step 2: Build and Push Images to Local Registry

```bash
# Build images
docker compose -f deploy/docker/docker-compose.yml build backend frontend

# Tag for local registry
docker tag myapp-backend:latest localhost:5000/myapp-backend:latest
docker tag myapp-frontend:latest localhost:5000/myapp-frontend:latest

# Push to local registry
docker push localhost:5000/myapp-backend:latest
docker push localhost:5000/myapp-frontend:latest
```

---

## Step 3: Configure Secrets

Create the Kubernetes secret from your `.env` file:

```bash
kubectl create namespace myapp

kubectl create secret generic backend-secrets \
    --namespace myapp \
    --from-env-file=.env
```

To update secrets:

```bash
kubectl delete secret backend-secrets --namespace myapp
kubectl create secret generic backend-secrets \
    --namespace myapp \
    --from-env-file=.env
```

---

## Step 4: Apply Manifests

```bash
kubectl apply -f deploy/k8s/ --namespace myapp
```

This applies all manifests in the `deploy/k8s/` directory:

| Manifest                    | Description                   |
| --------------------------- | ----------------------------- |
| `namespace.yaml`            | Creates the `myapp` namespace |
| `backend-deployment.yaml`   | FastAPI backend pods          |
| `worker-deployment.yaml`    | ARQ worker pods               |
| `backend-service.yaml`      | ClusterIP service for backend |
| `backend-ingress.yaml`      | Ingress rules for routing     |
| `postgres-statefulset.yaml` | PostgreSQL StatefulSet        |
| `redis-deployment.yaml`     | Redis deployment              |
| `hpa.yaml`                  | Horizontal Pod Autoscaler     |
| `pdb.yaml`                  | Pod Disruption Budget         |

---

## Step 5: Run Migrations

```bash
kubectl run migrations \
    --namespace myapp \
    --image=localhost:5000/myapp-backend:latest \
    --env-from=secret/backend-secrets \
    --restart=Never \
    -- alembic upgrade head

# Watch until complete
kubectl logs -f migrations --namespace myapp

# Clean up
kubectl delete pod migrations --namespace myapp
```

---

## Step 6: Verify the Deployment

```bash
# Check all pods are running
kubectl get pods --namespace myapp

# Check services
kubectl get services --namespace myapp

# Check ingress
kubectl get ingress --namespace myapp
```

Access the application at http://localhost:8080.

If you see a 404, check the Ingress is correctly configured:

```bash
kubectl describe ingress myapp-ingress --namespace myapp
```

---

## Useful kubectl Commands

```bash
# Stream logs from backend pods
kubectl logs -f -l app=backend --namespace myapp

# Open a shell in a running pod
kubectl exec -it <pod-name> --namespace myapp -- /bin/bash

# Scale a deployment
kubectl scale deployment backend --replicas=3 --namespace myapp

# View resource usage
kubectl top pods --namespace myapp

# Describe a pod (useful for debugging startup failures)
kubectl describe pod <pod-name> --namespace myapp
```

---

## Tearing Down

```bash
# Delete all resources in the namespace
kubectl delete namespace myapp

# Delete the k3d cluster entirely
k3d cluster delete myapp-local
```

---

## Differences from Production

When deploying to a real Kubernetes cluster (EKS, GKE, AKS, etc.):

- Replace `localhost:5000` registry with your real container registry
- Use a managed PostgreSQL service (RDS, Cloud SQL) instead of the StatefulSet
- Use a managed Redis service (ElastiCache, Memorystore) instead of the Redis deployment
- Configure a real Ingress class and TLS with cert-manager + Let's Encrypt
- Use OIDC-based service accounts instead of `kubectl create secret --from-env-file`
- Configure PodDisruptionBudgets for all stateless deployments
