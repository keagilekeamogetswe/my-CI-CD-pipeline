# docker build -f k8s/build/deamon.DockerFile --target grpc_server -t my-grpc-server .
# docker build -f k8s/build/deamon.DockerFile --target scheduler_consumer -t my-scheduler-consumer .
# docker build -f k8s/build/deamon.DockerFile --target letter_processor -t my-letter-processor .
docker build -f k8s/build/deamon.DockerFile --target job_processor -t job-processor .
read -p "Press any key to continue..."