minikube stop
minikube delete
minikube start --driver=docker --container-runtime=docker --memory=4g --cpus=2 --wait=all;
minikube image load k8s-token-service:latest

docker exec -it minikube bash

 # Clear any stuck rules first (optional, but safe)
iptables -t nat -F PREROUTING

sysctl -w net.ipv4.ip_forward=1

iptables -P FORWARD ACCEPT

iptables -A FORWARD -i eth0 -o cni0 -j ACCEPT
iptables -A FORWARD -i cni0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT