# 匿名提问小信箱

这是一个适合发到微信群里的匿名提问网站：

- 不需要登录，打开就随机生成“xx同学”
- 所有人看到同一个问题墙
- 支持文字和图片问题
- 支持匿名评论
- 管理员密钥默认是 `102938`
- 数据可以保存到 Supabase 云数据库

## 本机预览

没有配置 Supabase 时，网站会自动用本地文件模式，方便预览。

```bash
npm start
```

打开：

```text
http://localhost:3000
```

## Supabase 建库

1. 打开 Supabase，创建一个新项目。
2. 进入项目后，打开 SQL Editor。
3. 把 `supabase.sql` 里的内容复制进去并运行。
4. 打开 Project Settings → API，找到：
   - Project URL
   - service_role secret key

注意：`service_role secret key` 只能放在部署平台的环境变量里，不要发给别人，也不要写进前端页面。

## Vercel 部署

把整个文件夹上传到 GitHub，然后在 Vercel 导入这个仓库。

环境变量：

```text
ADMIN_KEY=102938
SUPABASE_URL=你的 Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role secret key
SUPABASE_TABLE=mailbox_questions
```

部署完成后，平台会给你一个 `https://...` 链接，把这个链接发到微信群即可。

## 备用本地文件模式

如果没有设置 Supabase 环境变量，服务器会把数据保存到 `data/questions.json`。这个模式适合本机测试，不建议用来长期分享。
