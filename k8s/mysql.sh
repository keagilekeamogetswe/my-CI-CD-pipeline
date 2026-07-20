kubectl apply -f secrets/mysql.yaml
# kubectl apply -f configmap/mysql.yaml
kubectl apply -f service/mysql.dns.yaml
kubectl apply -f stateful/mysql.yaml
kubectl apply -f service/mysql.replica.yaml
kubectl apply -f service/mysql.primary.yaml
# kubectl apply -f job/mysql.migration.yaml
read -r -p "Press Enter to continue..."