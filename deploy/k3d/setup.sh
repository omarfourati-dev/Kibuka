#!/bin/bash
set -euo pipefail

NAMESPACE="{{ kubernetes.namespace }}"
CLUSTER_NAME="{{ kubernetes.cluster_name }}"

echo "Setting up k3d cluster: $CLUSTER_NAME"

if ! command -v k3d &> /dev/null; then
  echo "ERROR: k3d is not installed. Install it from https://k3d.io"
  exit 1
fi

# Create cluster if it doesn't exist
if ! k3d cluster list | grep -q "$CLUSTER_NAME"; then
  echo "Creating k3d cluster..."
  k3d cluster create --config "$(dirname "$0")/cluster-config.yaml"
else
  echo "Cluster '$CLUSTER_NAME' already exists, skipping creation"
fi

echo "Waiting for nodes to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=60s

echo "Creating namespace..."
kubectl apply -f "$(dirname "$0")/../k8s/namespace.yaml"

echo "Installing nginx ingress controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml

echo "Waiting for ingress controller..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s

echo "Cluster ready! Use: kubectl get pods -n $NAMESPACE"
