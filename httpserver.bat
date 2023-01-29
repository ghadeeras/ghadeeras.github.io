start npm exec http-server -- ./dependencies -a localhost --port 8082
npm exec http-server -- . --ssl --cert certificate.crt --key privatekey.key --port 8080 --proxy http://localhost:8082
