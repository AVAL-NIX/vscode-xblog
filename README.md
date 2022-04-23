# xblog

vscode 的插件。 在vscode中搜索【xblog】下载 
主要是写完md文章以后可以通过vscode提交到自己的博客服务器，然后在自己搭建的博客上展示

## 配置参数

|参数名| 备注 |默认值|
|-|-|-|
|xblog.enable | 是否启用xblog| true|
|xblog.accessToken | 授权访问凭证 | |
|xblog.api | xblog Api 请求根路径 | http://localhost:8080|
|xblog.publishUri | [发布/修改]文档Uri地址 | /article/public|
|xblog.searchUri | 搜索文档Uri地址 | /article/search|
|xblog.uploadImageUri | 上传图片Uri地址 | /file/upload |
|xblog.localPath | 图片本地保存位置 | ./blogImage |

```text
{
    "xblog.enable": true,
    "xblog.accessToken": "123456",
    "xblog.api": "http://localhost:8080",
    "xblog.publishUri": "/article/public",
    "xblog.searchUri":  "/article/search",
    "xblog.uploadImageUri":  "/file/upload",
    "xblog.localPath":  "./blogImage"
}
```

## 发布文章 xblog.publishUri

发布文章DTO 服务端主要是以下5个属性

|属性|类型|描述|
|-|-|-|
|submitToken|String|文章提交凭证|
|title|String|文章标题|
|channel|String|文章频道|
|labels|String|文章标签 以,号隔开  标签1,标签2,标签3|
|content|String|文章主体|

返回值也是此DTO 用于映射文章头

|属性|类型|描述|
|-|-|-|
|code|int|成功大于0|
|msg|String|描述|
|data|Object|发布文章DTO|

![](https://github.com/AVAL-NIX/vscode-xblog/raw/master/images/public.gif)

## 上传图片 xblog.uploadImageUri

上传图片属性

|属性|类型|描述|
|-|-|-|
|multipartFile|File|图片文件|

返回值

|属性|类型|描述|
|-|-|-|
|code|int|成功大于0|
|msg|String|图片文件在服务器的绝对路径|

![](https://github.com/AVAL-NIX/vscode-xblog/raw/master/images/upload.gif)

## 搜索文章 xblog.searchUri

搜索文章属性

|属性|类型|描述|
|-|-|-|
|title|String|搜索的文章名|

返回值

|属性|类型|描述|
|-|-|-|
|code|int|成功大于0|
|msg|String|描述|
|data|List<发布文章DTO> |符合条件的文章,自行控制数量|

![](https://github.com/AVAL-NIX/vscode-xblog/raw/master/images/search.gif)



## 后记

```java
npm install
npm install --save qiniu
npm install -g typescript
npm install -g tslint --save
```
