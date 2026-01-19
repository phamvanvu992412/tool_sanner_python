# Hướng dẫn Deploy ứng dụng Scanner lên Server (Linux/Ubuntu)

Để ứng dụng hoạt động ổn định và có thể truy cập Camera (yêu cầu HTTPS), bạn cần deploy bằng Gunicorn kết hợp với Nginx.

## 1. Chuẩn bị môi trường
Cập nhật hệ thống và cài đặt các thư viện cần thiết:
```bash
sudo apt update
sudo apt install python3-pip python3-venv libzbar0 nginx -y
```
*(Lưu ý: `libzbar0` là bắt buộc để thư viện `pyzbar` hoạt động trên Linux)*

## 2. Thiết lập Project
1. Clone code lên server.
2. Tạo môi trường ảo (Virtual Environment):
-> cd đến thư mục chứ code chạy các lệnh bên dưới
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn eventlet  # Dùng eventlet cho Socket.IO
```

## 3. Chạy với Gunicorn
Thay vì `python app.py`, trong môi trường production ta dùng Gunicorn:
```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 app:app
```

## 4. Cấu hình Nginx (Reverse Proxy)
Đây là bước quan trọng để hỗ trợ WebSockets và HTTPS. Tạo file cấu hình:
`sudo nano /etc/nginx/sites-available/scanner`

Nội dung cấu hình:
```nginx
server {
    listen 80;
    server_name domain_cua_ban.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Cấu hình riêng cho Socket.IO
    location /socket.io {
        proxy_pass http://127.0.0.1:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
Kích hoạt cấu hình:
```bash
sudo ln -s /etc/nginx/sites-available/scanner /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

## 5. Cài đặt SSL (BẮT BUỘC)
Trình duyệt chỉ cho phép mở Camera trên **localhost** hoặc **HTTPS**.
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d domain_cua_ban.com
```

## 6. Tự động hóa với Systemd
Tạo file service để ứng dụng tự khởi động lại khi server crash:
`sudo nano /etc/systemd/system/scanner.service`

```ini
[Unit]
Description=Gunicorn instance to serve Scanner App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/your/project
Environment="PATH=/path/to/your/project/venv/bin"
ExecStart=/path/to/your/project/venv/bin/gunicorn --worker-class eventlet -w 1 --bind 127.0.0.1:5000 app:app

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl start scanner
sudo systemctl enable scanner
```
