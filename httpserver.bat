start http-server ./dependencies --port 8082
http-server . --port 8080 --proxy http://localhost:8082
