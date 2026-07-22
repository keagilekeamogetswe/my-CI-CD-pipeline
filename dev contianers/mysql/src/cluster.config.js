const skip_verify = process.env.ENV === "test";
export const k8s_cluster_config = {
  clusters: [
    {
      name: "minikube",
      server: "https://minikube:8443",
      skipTLSVerify: skip_verify, // Development only
    },
  ],
  users: [
    {
      name: "developer",
      user: {
        token:
          "eyJhbGciOiJSUzI1NiIsImtpZCI6Ikd0OEdaN1A1TWZGQl9QdHRJblhYUkhCSm5hREdJczFZZEhZWHpWZnE1ancifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxODIwNzQ0MTY1LCJpYXQiOjE3ODQ3NDc3NjUsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwianRpIjoiMjBhYzc1ODgtNGU2OC00YjRhLTg4YmItNzk5YmRiZGMwMGY3Iiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJzb2NpYWwtbmV0d29ya3MiLCJzZXJ2aWNlYWNjb3VudCI6eyJuYW1lIjoiZGV2ZWxvcGVyIiwidWlkIjoiNmY0Y2RlNGQtMzdiMS00MzZkLThiMDItZDY0ODc1M2RlNTAzIn19LCJuYmYiOjE3ODQ3NDc3NjUsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpzb2NpYWwtbmV0d29ya3M6ZGV2ZWxvcGVyIn0.g-FfQFMlS4jwVMenCBnB5z9CocVWgPhLDSOw64vvoTlnjSXGsJDL6bdzE-HAwX2Aqff63vFEe78aPldsxPwJv0FBe0PJ_PdOwml_FqBuoxNrDhOt7knRY67vd2LR1JAkN8PP1Cx3y8wgl2eTd3Iobdz5XjKinoz-UIiw6ZzSqcNz6PDuOgVK-xQaKRCWDRTDBzD1uUkuRHtXsUi5lOV2i6mS0mP-399r-hG9GrpLjCBJMmLvesiW8Ot17irYvsUg8Ffy1PR2nW5hY_mjawKKV5YAFQmN_3br-sG11X5DdiwOeWtz1V00sWMyGaesCvNm6ZX9cdqmfr0p-Bho4EEbMQ",
      },
    },
  ],
  contexts: [
    {
      name: "minikube",
      cluster: "minikube",
      user: "developer",
    },
  ],
  currentContext: "minikube",
};
