FROM timberio/vector:0.40.0-alpine
COPY docker/prod/vector.yaml /etc/vector/vector.yaml
