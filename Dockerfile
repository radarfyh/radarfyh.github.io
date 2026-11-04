ARG NGINX_IMAGE=nginx:1.28-alpine
FROM ${NGINX_IMAGE}
RUN sed -i -E 's@^pid[[:space:]]+[^;]+;@pid /tmp/nginx.pid;@' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /etc/nginx/conf.d /var/cache/nginx /usr/share/nginx/html
COPY --chown=nginx:nginx target/site/ /usr/share/nginx/html/
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
