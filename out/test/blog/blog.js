"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const vscode_1 = require("vscode");
//  获取MD元数据插件
const fm = require("front-matter");
const request = require("request");
const fs = require("fs");
const util = require("util");
const moment = require('moment');
const { spawn } = require('child_process');
// tslint:disable-next-line: class-name
class xblog {
    constructor() {
        this.validateConfig();
        let config = vscode.workspace.getConfiguration('xblog');
        this.publicApi = config.api + config.publishUri;
        this.updateApi = config.api + config.updateUrl;
        this.deleteApi = config.api + config.deleteUri;
        this.searchApi = config.api + config.searchUri;
        this.uploadApi = config.api + config.uploadImageUri;
        this.accessToken = config.accessToken;
    }
    /**
     * 配置验证
     */
    validateConfig() {
        // 配置属性
        let config = vscode_1.workspace.getConfiguration('xblog');
        if (!config.enable) {
            vscode_1.window.showWarningMessage("xblog 已禁用");
            return false;
        }
        if (config.accessToken === null || config.accessToken === "") {
            vscode_1.window.showWarningMessage("授权访问凭证未配置");
            return false;
        }
        return true;
    }
    /**
     * 数据验证
     *
     * @param isCheck
     */
    validateData(isCheck) {
        let r = new R();
        // 获取内容
        let activeText = vscode_1.window.activeTextEditor;
        let text = activeText.document.getText();
        // 解析元数据
        let result = fm(text);
        let submitToken = result.attributes.submitToken;
        let title = result.attributes.title;
        let labels = result.attributes.labels;
        let channel = result.attributes.channel;
        let content = result.body;
        if (isCheck && (submitToken === null || submitToken === "")) {
            r.msg = '元数据[签名]丢失，请重新获取数据';
            r.code = -1;
            return r;
        }
        if (isCheck && (title === null || title === "")) {
            r.msg = '请填写元数据[标题]';
            r.code = -1;
            return r;
        }
        if (isCheck && (channel === null || channel === "")) {
            r.msg = '请填写元数据[频道]';
            r.code = -1;
            return r;
        }
        if (isCheck && (content === null || content === "")) {
            r.msg = '请填写文档内容';
            r.code = -1;
            return r;
        }
        var data = {
            "submitToken": submitToken === undefined ? "" : submitToken,
            "title": title === undefined ? "" : title,
            "channel": channel === undefined ? "" : channel,
            "labels": labels === undefined ? "" : labels,
            "content": content === undefined ? "" : content
        };
        r.code = 1;
        r.msg = "处理成功!";
        r.data = data;
        return r;
    }
    /**
     * 发布文章
     */
    publicAritle() {
        let r = this.validateData(false);
        if (r.code < 1) {
            vscode_1.window.showInformationMessage(r.msg);
            return null;
        }
        let data = r.data;
        this.requestApi(this.publicApi, data, (body) => {
            let activeText = vscode_1.window.activeTextEditor;
            let text = activeText.document.lineAt(0).text;
            activeText.edit((editBuilder) => {
                let meta = genMetaHeader(body.data.submitToken, body.data.title, body.data.channel, body.data.labels);
                if (text.startsWith("---")) {
                    editBuilder.replace(new vscode_1.Range(new vscode_1.Position(0, 0), new vscode_1.Position(6, data.length)), meta);
                }
                else {
                    editBuilder.insert(new vscode_1.Position(0, 0), meta);
                }
            });
            vscode_1.window.showInformationMessage(body.msg);
        });
    }
    /**
     * 搜索文章
     *
     * @param data
     */
    searchAritle(data) {
        this.requestApi(this.searchApi, data, (body) => {
            let array = [];
            if (body.data === null || body.data.length < 1) {
                vscode_1.window.showInformationMessage("没有查询到文章");
                return;
            }
            for (var i = 0; i < body.data.length; i++) {
                array[i] = body.data[i].title;
            }
            vscode_1.window.showQuickPick(array).then(function (title) {
                let json = findByTitle(body.data, title);
                let content = genMetaHeader(json['submitToken'], json['title'], json['channel'], json['labels']) + json['content'];
                let filePath = vscode_1.workspace.rootPath;
                if (filePath === undefined || filePath === null) {
                    let files = vscode_1.workspace.textDocuments;
                    if (files.length) {
                        filePath = path.dirname(files[files.length - 1].fileName);
                    }
                    else {
                        vscode_1.window.setStatusBarMessage("错误,获取工作空间目录失败");
                        vscode_1.workspace.openTextDocument("untitled-1.md").then(document => {
                            vscode_1.window.showTextDocument(document);
                        });
                    }
                }
                // 新建文档
                let newFile = vscode_1.Uri.parse("untitled:" + path.join(filePath, title + ".md"));
                vscode_1.workspace.openTextDocument(newFile).then(document => {
                    const edit = new vscode_1.WorkspaceEdit();
                    edit.insert(newFile, new vscode_1.Position(0, 0), content);
                    return vscode_1.workspace.applyEdit(edit).then(success => {
                        if (success) {
                            vscode_1.window.showTextDocument(document);
                        }
                        else {
                            vscode_1.window.showErrorMessage("创建文件出错!");
                        }
                    });
                });
            });
        });
    }
    /**
     * 上传图片
     * @param localPath
     */
    uploadImg(localPath) {
        request.post({
            url: this.uploadApi,
            headers: {
                "accessToken": this.accessToken
            },
            formData: {
                "multipartFile": fs.createReadStream(localPath)
            }
        }, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                let data = eval('(' + body + ')');
                if (data.code < 1) {
                    vscode.window.showWarningMessage(data.msg);
                    return;
                }
                let editor = vscode.window.activeTextEditor;
                editor.edit((editBuilder) => {
                    let markdownStr = genImage("", data.msg);
                    editBuilder.insert(editor.selection.active, markdownStr);
                });
            }
        });
    }
    /**
     * 复制图片
     */
    copyImg() {
        start();
    }
    /**
     * 发送请求
     *
     * @param api
     * @param data
     * @param cb
     */
    requestApi(api, data, cb) {
        request.post({
            url: api,
            json: true,
            headers: {
                "accessToken": this.accessToken
            },
            form: data
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                if (body.code < 1) {
                    vscode_1.window.showWarningMessage(body.msg);
                    return;
                }
                cb(body);
            }
            else {
                vscode_1.window.showWarningMessage("请求失败");
            }
        });
    }
}
exports.xblog = xblog;
const IMG = "![%s](%s \"%s\")";
/**
 * 生成markdown Image
 */
function genImage(title, url) {
    return util.format(IMG, title, url, title);
}
//标题头
const METADATA_HEADER = `\
---
submitToken: %s
title: %s
channel: %s
labels: %s
---
`;
function genMetaHeader(submitToken, title, channel, labels) {
    return util.format(METADATA_HEADER, submitToken, title, channel, labels);
}
/**
 * 服务器对应的返回类
 */
class R {
    constructor(code, msg, data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }
}
//截屏
function start() {
    // 获取当前编辑文件
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    let fileUri = editor.document.uri;
    if (!fileUri) {
        return;
    }
    if (fileUri.scheme === 'untitled') {
        vscode.window.showInformationMessage('Before paste image, you need to save current edit file first.');
        return;
    }
    let selection = editor.selection;
    let selectText = editor.document.getText(selection);
    if (selectText && !/^[\w\-.]+$/.test(selectText)) {
        vscode.window.showInformationMessage('Your selection is not a valid file name!');
        return;
    }
    let config = vscode.workspace.getConfiguration('xblog');
    let localPath = config['localPath'];
    if (localPath && (localPath.length !== localPath.trim().length)) {
        vscode.window.showErrorMessage('The specified path is invalid. "' + localPath + '"');
        return;
    }
    let filePath = fileUri.fsPath;
    let imagePath = getImagePath(filePath, selectText, localPath);
    const mdFilePath = editor.document.fileName;
    const mdFileName = path.basename(mdFilePath, path.extname(mdFilePath));
    createImageDirWithImagePath(imagePath).then(imagePath => {
        saveClipboardImageToFileAndGetPath(imagePath, (imagePath) => {
            if (!imagePath) {
                return;
            }
            if (imagePath === 'no image') {
                vscode.window.showInformationMessage('没有要复制的图片,请重新截屏!');
                return;
            }
            imagePath = imagePath.substring(0, imagePath.lastIndexOf(".")) + ".png";
            new xblog().uploadImg(imagePath);
        });
    }).catch(err => {
        vscode.window.showErrorMessage('创建文件夹失败!.');
        return;
    });
}
function getImagePath(filePath, selectText, localPath) {
    // 图片名称
    let imageFileName = '';
    if (!selectText) {
        imageFileName = moment().format("Y-MM-DD-HH-mm-ss") + '.png';
    }
    else {
        imageFileName = selectText + '.png';
    }
    // 图片本地保存路径
    let folderPath = path.dirname(filePath);
    let imagePath = '';
    if (path.isAbsolute(localPath)) {
        imagePath = path.join(localPath, imageFileName);
    }
    else {
        imagePath = path.join(folderPath, localPath, imageFileName);
    }
    return imagePath;
}
function createImageDirWithImagePath(imagePath) {
    return new Promise((resolve, reject) => {
        let imageDir = path.dirname(imagePath);
        fs.exists(imageDir, (exists) => {
            if (exists) {
                resolve(imagePath);
                return;
            }
            fs.mkdir(imageDir, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(imagePath);
            });
        });
    });
}
function saveClipboardImageToFileAndGetPath(imagePath, cb) {
    if (!imagePath) {
        return;
    }
    let platform = process.platform;
    if (platform === 'win32') {
        // Windows
        const scriptPath = path.join(__dirname, './lib/pc.ps1');
        const powershell = spawn('powershell', [
            '-noprofile',
            '-noninteractive',
            '-nologo',
            '-sta',
            '-executionpolicy', 'unrestricted',
            '-windowstyle', 'hidden',
            '-file', scriptPath,
            imagePath
        ]);
        powershell.on('exit', function (code, signal) {
        });
        powershell.stdout.on('data', function (data) {
            cb(data.toString().trim());
        });
    }
    else if (platform === 'darwin') {
        // Mac
        let scriptPath = path.join(__dirname, './lib/mac.applescript');
        let ascript = spawn('osascript', [scriptPath, imagePath]);
        ascript.on('exit', function (code, signal) {
        });
        ascript.stdout.on('data', function (data) {
            cb(data.toString().trim());
        });
    }
    else {
        // Linux
        let scriptPath = path.join(__dirname, './lib/linux.sh');
        let ascript = spawn('sh', [scriptPath, imagePath]);
        ascript.on('exit', function (code, signal) {
        });
        ascript.stdout.on('data', function (data) {
            let result = data.toString().trim();
            if (result === "no xclip") {
                vscode.window.showInformationMessage('You need to install xclip command first.');
                return;
            }
            cb(result);
        });
    }
}
/**
 * 根据标题查找
 * @param {array} array  数据集
 * @param {string} title  标题
 * @return {JSON} markdown 数据对象
 */
function findByTitle(array, title) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].title === title) {
            return array[i];
        }
    }
    return null;
}
//# sourceMappingURL=blog.js.map