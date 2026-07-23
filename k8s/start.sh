kubectl config set-context --current --namespace=social-networks
kubectl apply -f namespace/social.network.yaml
read -r -p "Press Enter to continue..."
