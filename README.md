# 匿名提问小信箱

这是一个可以发到微信群里的匿名提问网站：

- 不需要登录，打开就随机生成“xx同学”
- 所有人看到同一个问题墙
- 支持文字和图片问题
- 支持匿名评论
- 管理员密钥默认是 `102938`
- 数据保存到 Supabase 云数据库
- 可以直接用 GitHub Pages 免费发布

## Supabase 建库

1. 打开 Supabase 项目。
2. 进入 SQL Editor。
3. 把 `supabase.sql` 里的内容复制进去并运行。

如果你之前已经运行过旧版 SQL，也可以直接运行新版 `supabase.sql`，它会补上 GitHub Pages 直连需要的权限和函数。

## 填 Supabase 地址和公开密钥

打开 `app.js`，找到最上面的这几行：

```js
const SUPABASE_URL = "";
const SUPABASE_PUBLISHABLE_KEY = "";
```

改成：

```js
const SUPABASE_URL = "你的 Supabase URL";
const SUPABASE_PUBLISHABLE_KEY = "你的 Publishable key";
```

例如：

```js
const SUPABASE_URL = "https://bzxungkbteyzhudeczwb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xxxxx";
```

注意：这里用的是 `Publishable key`，不是 `Secret key`。不要把 `sb_secret_...` 写进 `app.js`。

## GitHub Pages 发布

1. 把更新后的文件上传到 GitHub 仓库。
2. 进入仓库的 Settings。
3. 左侧点 Pages。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，文件夹选择 `/root`。
6. 点 Save。
7. 等一会儿，GitHub 会给你一个 `https://...github.io/...` 链接。

这个链接就是可以发到微信群里的地址。

## 需要上传的核心文件

- `index.html`
- `styles.css`
- `app.js`
- `supabase.sql`
- `README.md`

其他 Node/Vercel 文件留着也没关系，GitHub Pages 不会用到它们。
