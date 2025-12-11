#发布
JEKYLL_ENV=production bundle exec jekyll build

#重载nginx配置文件
nginx -s reload

#设置SELinux
sudo semanage fcontext -a -t httpd_sys_content_t "/feng-cloud/radarfyh.github.io/_site(/.*)?"
sudo restorecon -Rv /feng-cloud/radarfyh.github.io/_site

# 设置文件夹权限
sudo chmod -R 755 /feng-cloud/radarfyh.github.io/_site
sudo chown -R nginx:nginx /feng-cloud/radarfyh.github.io/_site