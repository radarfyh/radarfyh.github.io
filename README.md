# 安装数据库 --------------------------------------------------------------------------------------------------------------------

```
#下载mysql和安装
tar -xvf mysql-5.7.42-linux-glibc2.12-x86_64.tar.gz -C /usr/local/
cd /usr/local/
mv mysql-5.7.42-linux-glibc2.12-x86_64 mysql

#创建mysql用户组和用户
groupadd mysql
useradd -r -g mysql mysql
mkdir -p /var/mysql/data/
mkdir -p /var/mysql/logs/
mkdir -p /etc/my.cnf.d/
chown mysql:mysql -R /var/mysql
chown mysql:mysql -R /usr/local/mysql

#配置my.cnf
cat << "EOF" > /etc/my.cnf
[client-server]
# include all files from the config directory
!includedir /etc/my.cnf.d
[mysqld]
bind-address=0.0.0.0
port=3306
user=mysql
basedir=/usr/local/mysql
datadir=/var/mysql/data
socket=/tmp/mysql.sock
log-error=/var/mysql/logs/mysql.err
log_bin=/var/mysql/logs/mysql-bin.log
general_log_file=/var/mysql/logs/mysql-general.log
slow_query_log_file=/var/mysql/logs/mysql-slow.log
pid-file=/var/mysql/data/mysql.pid
#character config
character_set_server=utf8mb4
symbolic-links=0
explicit_defaults_for_timestamp=true
server-id=1
#表名自动转为小写
lower_case_table_names=1
#最大连接数量设置为 500
max_connections=500
EOF

#初始化数据库
cd /usr/local/mysql/bin/ 
./mysqld --defaults-file=/etc/my.cnf --basedir=/usr/local/mysql/ --datadir=/var/mysql/data --user=mysql --initialize
#获取初始密码
cat /var/mysql/logs/mysql.err

#安装chkconfig
cd /root/mysql
rpm -ivh chkconfig-1.24-1.el9.x86_64.rpm

#启动mysql
cp /usr/local/mysql/support-files/mysql.server /etc/init.d/mysql
service mysql start
chkconfig --add /etc/init.d/mysql
chkconfig mysql on
service mysql restart

#安装libtinfo
cd /root/mysql
rpm -ivh ncurses-c++-libs-6.2-10.20210508.el9.x86_64.rpm
ln -s /usr/lib64/libncurses.so.6 /usr/lib64/libncurses.so.5
ln -s /lib64/libtinfo.so.6 /lib64/libtinfo.so.5
#登录mysql
cd /usr/local/mysql/bin
./mysql -u root -p

#新密码
mysql> ALTER USER 'root'@'localhost' IDENTIFIED BY 'xxx';
mysql> flush privileges;
mysql> exit;
```

# 安装 iptables --------------------------------------------------------------------------------------------------------------------

```
#禁用原生防火墙
dnf remove firewall-cmd -y
#查看已安装情况
rpm -qa | grep iptables
dnf install iptables-services -y
#重新查看已安装的包
rpm -qa | grep iptables
#激活自启
systemctl enable iptables
#启动系统服务
service iptables start

#代理到radarfyh.github.com
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 80 -j ACCEPT
#开放 mysql
sudo iptables -I INPUT -p tcp --dport 3306 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 3306 -j ACCEPT

#开放 nacos 2.x
sudo iptables -I INPUT -p tcp --dport 8848 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 8848 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 9848 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 9848 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 9849 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 9849 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 7848 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 7848 -j ACCEPT
#开放 reids
sudo iptables -I INPUT -p tcp --dport 6379 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 6379 -j ACCEPT
#开放 minio
sudo iptables -I INPUT -p tcp --dport 9000 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 9000 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 9001 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 9001 -j ACCEPT

service iptables save
```

# 安装 java --------------------------------------------------------------------------------------------------------------------

```
#下载java 17和安装
cd /root/java
mkdir -p /usr/local/java
tar -zxvf jdk-17_linux-x64_bin.tar.gz -C /usr/local/java

#配置环境变量
echo '
export JAVA_HOME=/usr/local/java/jdk-17.0.12
export JRE_HOME=${JAVA_HOME}/jre
export CLASSPATH=.:${JAVA_HOME}/lib:${JRE_HOME}/lib:$CLASSPATH
export JAVA_PATH=${JAVA_HOME}/bin:${JRE_HOME}/bin
export PATH=$PATH:${JAVA_PATH}
' >> /etc/profile.d/java17.sh

source /etc/profile

#测试java是否安装成功·
java -version
```

# 安装 nacos --------------------------------------------------------------------------------------------------------------------

```
#下载nacos并安装
cd /root/nacos
tar -zxvf nacos-server-2.4.2.tar.gz

mv nacos /usr/local

#配置nacos数据库
cd /usr/local/nacos/conf
vim application.properties
spring.sql.init.platform=mysql
db.num=1
db.url.0=jdbc:mysql://127.0.0.1:3306/nacos8848?characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useUnicode=true&useSSL=false&serverTimezone=UTC
db.user.0=nacos_prod
db.password.0=xxx

#创建nacos数据库
/usr/local/mysql/bin/mysql -u root -p
mysql> drop user if exists 'nacos_prod'@'localhost';
mysql> drop user if exists 'nacos_prod'@'%';
mysql> create user 'nacos_prod'@'localhost' IDENTIFIED BY 'xxx';
mysql> GRANT select, insert, update, delete ON nacos8848.* TO 'nacos_prod'@'localhost' IDENTIFIED BY 'xxx';
mysql> flush privileges;
mysql> exit;

#配置nacos启动服务
cat << "EOF" > /etc/systemd/system/nacos.service
[Unit]
Description=Nacos Server
After=network.target
[Service]
Type=forking
Environment="JAVA_HOME=/usr/local/java/jdk-17.0.12/"
ExecStart=/bin/sh -c "/usr/local/nacos/bin/startup.sh -m standalone"
ExecStop=/bin/sh -c "/usr/local/nacos/bin/shutdown.sh"
User=root
Restart=on-failure
LimitNOFILE=65536
[Install]
WantedBy=multi-user.target
EOF

#调整启动内存
vi /usr/local/nacos/bin/startup.sh
#生产环境：修改这一句的两个512m或者一个256m
JAVA_OPT="${JAVA_OPT} ${CUSTOM_NACOS_MEMORY:- -Xms512m -Xmx512m -Xmn256m}"
#测试环境：
JAVA_OPT="${JAVA_OPT} ${CUSTOM_NACOS_MEMORY:- -Xms128m -Xmx256m -Xmn128m}"

#重载系统服务管理器配置
systemctl daemon-reload

#启动系统服务
systemctl enable nacos.service
systemctl start nacos.service
#测试nacos是否启动成功
curl -X POST '127.0.0.1:8848/nacos/v1/auth/login' -d 'username=nacos&password=xxx'
```

# 安装 redis --------------------------------------------------------------------------------------------------------------------

```
cd /root/redis
#解压，并移到动指定目录
tar -zxvf redis-6.2.11.tar.gz
mv redis-6.2.11 /usr/local/redis
#创建日志目录
mkdir -p /var/redis/logs

#配置redis启动服务
cat <<'EOF' > /etc/profile.d/redis.sh
export REDIS_HOME=/usr/local/redis
export PATH=$PATH:$REDIS_HOME/bin
EOF
#加载环境变量
source /etc/profile

#创建redis配置文件
cd /usr/local/redis/bin
mv /etc/redis.conf /etc/redis-bak.conf
cp ../redis.conf /etc/redis.conf #也可拷贝自版本自带redis.conf

vi /etc/redis.conf
#以前台模式运行Redis **重点**
daemonize no
#修改密码
requirepass xxx
#日志文件
logfile "/var/redis/logs/redis-server-start.log"
#进程文件
pidfile /var/run/redis_6379.pid
#取消保护模式 **重点**
protected-mode no

#配置redis启动服务
cat << "EOF" > /etc/systemd/system/redis.service
[Unit]
Description=Redis In-Memory Data Store
After=network.target
[Service]
ExecStart=/bin/sh -c "/usr/local/redis/bin/redis-server /etc/redis.conf"
ExecStop=/bin/sh -c "/usr/local/redis/bin/redis-cli -a rtyl123456 shutdown"
User=root
Restart=on-failure
LimitNOFILE=65536
[Install]
WantedBy=multi-user.target
EOF

#重载配置
systemctl daemon-reload

#设置vm参数
sysctl vm.overcommit_memory=1
sysctl -p
#启动Redis服务
systemctl start redis.service
systemctl enable redis.service
systemctl status redis.service
#查看启动日志：
tail -f /var/redis/logs/redis-server-start.log
```

# 安装 git和maven --------------------------------------------------------------------------------------------------------------------

```
dnf install git -y
dnf install maven -y

#创建本地仓库目录
mkdir -p /maven-localRepository
#修改maven配置文件----------------
vi /etc/maven/settings.xml
<localRepository>/maven-localRepository</localRepository>
<mirror>
  <id>aliyun</id>
  <mirrorOf>*</mirrorOf>
  <name>public aliyun</name>
  <url>https://maven.aliyun.com/repository/public</url>
</mirror>

#配置nacos服务器地址
vi /etc/hosts
127.0.0.1 nacos-dev nacos-test nacos-prod
```

# 安装 Beautiful Jekyll --------------------------------------------------------------------------------------------------------------------

```
#在 Rocky Linux 9.5 上部署 Beautiful Jekyll

# 更新系统
sudo dnf update -y

# 安装基础开发工具和依赖
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y git zlib-devel openssl-devel

# 安装 Ruby 3.0+ (Rocky Linux 9默认仓库包含Ruby 3.0)
sudo dnf install -y ruby ruby-devel rubygems

ruby -v
#显示结果------------
ruby 3.0.7p220 (2024-04-23 revision 724a071175) [x86_64-linux]

gem -v
#显示结果------------
3.2.33

#gem默认版本为3.2.33，要升级，不然安装sass-embedded报错：sass-embedded-1.63.3-x86_64-linux-gnu requires rubygems version >= 3.3.22, which is incompatible with the current version, 3.2.33
gem install rubygems-update -v 3.4.22
#也可以使用如下指令
#gem update --system 3.4.22
# 安装必要的开发工具
sudo dnf install -y gcc gcc-c++ make patch

# 设置全局镜像
bundle config mirror.https://rubygems.org https://mirrors.aliyun.com/rubygems/

# 安装 Jekyll 和 Bundler
mkdir -p /usr/local/ruby/3.0.0
# 指定安装到用户目录
gem install --install-dir /usr/local/ruby/3.0.0 bundler

gem install --install-dir /usr/local/ruby/3.0.0 jekyll

# 将Ruby Gems添加到PATH
echo 'export PATH=$PATH:/usr/local/ruby/3.0.0/bin' >> /etc/profile.d/ruby.sh
source /etc/profile

echo 'export PATH=$PATH:$HOME/.local/share/gem/ruby3.0/bin' >> ~/.bashrc
source ~/.bashrc

# 检查版本，检查安装是否成功
jekyll -v
#显示结果------------
jekyll 4.4.1

bundler -v
#显示结果------------
Bundler version 2.4.22

# 克隆项目
git clone https://github.com/radarfyh/radarfyh.github.io
cd radarfyh.github.io

# 安装项目依赖

chmod 664 /feng/radarfyh.github.io/Gemfile

cd /feng/radarfyh.github.io

# 设置项目镜像源，只对当前项目生效
bundle config set --local mirror.https://rubygems.org https://mirrors.aliyun.com/rubygems/

vi Gemfile
# 在Gemfile中添加或替换以下内容
gem 'sassc'
gem 'sass-embedded', '1.63.3'

bundle install
#显示结果------------
[radarfyh@iZ2ze6qcuxrmhddeb4m9xuZ radarfyh.github.io]$ bundle install
Fetching source index from https://mirrors.aliyun.com/rubygems/
Resolving dependencies...
Fetching ffi 1.17.1 (x86_64-linux-gnu)
Fetching sass-embedded 1.63.3 (x86_64-linux-gnu)
Installing ffi 1.17.1 (x86_64-linux-gnu)
Installing sass-embedded 1.63.3 (x86_64-linux-gnu)
Fetching jekyll-sass-converter 3.0.0
Installing jekyll-sass-converter 3.0.0
Fetching jekyll 4.4.1
Installing jekyll 4.4.1
Fetching jekyll-sitemap 1.4.0
Installing jekyll-sitemap 1.4.0
Bundle complete! 7 Gemfile dependencies, 40 gems now installed.
Bundled gems are installed into `./vendor/bundle`
1 installed gem you directly depend on is looking for funding.
  Run `bundle fund` for details

# 生产环境构建
JEKYLL_ENV=production bundle exec jekyll build
#显示结果------------
Configuration file: /feng/radarfyh.github.io/_config.yml
            Source: /feng/radarfyh.github.io
       Destination: /feng/radarfyh.github.io/_site
 Incremental build: disabled. Enable with --incremental
      Generating... 
                    done in 0.645 seconds.
 Auto-regeneration: disabled. Use --watch to enable.

```

# 安装 nginx--------------------------------------------------------------------------------------------------------------------

```
#安装nginx
dnf install nginx

#修改80端口的根目录配置
vi /etc/nginx/nginx.conf
......
root         /feng/radarfyh.github.io/_site;
......
#在/etc/nginx/conf.d/中新增配置来新增server
server {
  listen 1000;
  server_name hunting-info.ltd;  # 可替换为你的域名或IP

  location / {
    proxy_pass https://radarfyh.github.io;
    proxy_set_header Host radarfyh.github.io;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 如果需要支持 WebSocket，可添加以下配置：
    # proxy_http_version 1.1;
    # proxy_set_header Upgrade $http_upgrade;
    # proxy_set_header Connection "upgrade";
  }
}

#在/etc/nginx/default.d/中新增配置来新增链接

location = /site/favicon.ico {
    proxy_pass http://hunting-info.ltd:2000/site/favicon.ico;
}

location /site {
    proxy_pass http://hunting-info.ltd:2000/site/index.html;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}


#重载nginx配置文件
nginx -s reload

#google网站收录，在DNS中增加TXT记录
@ google-site-verification=PCzMVq6BqJ0qsJwgvOaNcHdFhCUGqyRHc3qfNFpxGFw

#百度网站收录，把baidu_verify_codeva-OUrs9BN6rZ.html拷贝到发布目录_site中

```

