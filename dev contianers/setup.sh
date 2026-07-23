set -e
#Load $MINIKUBE_IP as env
MINIKUBE_IP=$(getent hosts minikube | awk '{ print $1 }')

ip route add 10.244.0.0/16 via $MINIKUBE_IP
ip route add 10.96.0.0/12 via $MINIKUBE_IP

cat <<EOF > /etc/resolv.conf
nameserver $MINIKUBE_IP
search social-networks.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
EOF

npm install
