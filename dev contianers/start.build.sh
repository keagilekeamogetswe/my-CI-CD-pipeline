# Build the operator image
docker build --target mysql-operator -t k8s-mysql-operator:latest .
# Build the token image
docker build --target  k8s-token-dist -t k8s-token-service:latest .
