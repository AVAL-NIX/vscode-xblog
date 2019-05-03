import * as path from 'path';
import { workspace, window, Range, Position, WorkspaceEdit, Uri } from 'vscode';

//  获取MD元数据插件
const fm = require("front-matter");
const request = require("request");
const fs = require("fs");
const util = require("util");

const moment = require('moment');
const { spawn } = require('child_process');

class Xblog {

    publicApi: string;
    updateApi: string;
    deleteApi: string;
    searchApi: string;
    uploadApi: string;
    accessToken: string;

    constructor() {
        this.validateConfig();
        let config = workspace.getConfiguration('xblog');
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
    validateConfig(): boolean {
        // 配置属性
        let config = workspace.getConfiguration('xblog');

        if (!config.enable) {
            window.showWarningMessage("xblog 已禁用");
            return false;
        }

        if (config.accessToken === null || config.accessToken === "") {
            window.showWarningMessage("授权访问凭证未配置");
            return false;
        }
        return true;
    }

    /**
     * 数据验证
     *
     * @param isCheck
     */
    validateData(isCheck: boolean): R {
        let r = new R();
        // 获取内容
        let activeText: any = window.activeTextEditor;
        let text: string = activeText.document.getText();
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
            window.showInformationMessage(r.msg);
            return null;
        }
        let data = r.data;
        this.requestApi(this.publicApi, data, (body: any) => {
            let activeText: any = window.activeTextEditor;
            let text = activeText.document.lineAt(0).text;
            activeText.edit((editBuilder: { replace: (arg0: Range, arg1: string) => void; insert: (arg0: Position, arg1: string) => void; }) => {
                let meta = genMetaHeader(body.data.submitToken, body.data.title, body.data.channel, body.data.labels);
                if (text.startsWith("---")) {
                    editBuilder.replace(new Range(new Position(0, 0), new Position(6, data.length)), meta);
                } else {
                    editBuilder.insert(new Position(0, 0), meta);
                }
            });
            window.showInformationMessage(body.msg);
        });
    }

    /**
     * 搜索文章
     *
     * @param data
     */
    searchAritle(data: any) {
        this.requestApi(this.searchApi, data, (body: any) => {
            let array = [];
            if (body.data === null || body.data.length < 1) {
                window.showInformationMessage("没有查询到文章");
                return;
            }
            for (var i = 0; i < body.data.length; i++) {
                array[i] = body.data[i].title;
            }
            window.showQuickPick(array).then(function (title) {
                let json = findByTitle(body.data, title);
                let content = genMetaHeader(json['submitToken'], json['title'],json['channel'], json['labels']) + json['content'];

                let filePath: any = workspace.rootPath;
                if (filePath === undefined || filePath === null) {
                    let files = workspace.textDocuments;
                    if (files.length) {
                        filePath = path.dirname(files[files.length - 1].fileName);
                    } else {
                        window.setStatusBarMessage("错误,获取工作空间目录失败");
                        workspace.openTextDocument("untitled-1.md").then(document => {
                            window.showTextDocument(document);
                        });
                    }
                }
                // 新建文档
                let newFile = Uri.parse("untitled:" + path.join(filePath, title + ".md"));
                workspace.openTextDocument(newFile).then(document => {
                    const edit = new WorkspaceEdit();
                    edit.insert(newFile, new Position(0, 0), content);

                    return workspace.applyEdit(edit).then(success => {
                        if (success) {
                            window.showTextDocument(document);
                        } else {
                            window.showErrorMessage("创建文件出错!");
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
    uploadImg(localPath: string) {
        request.post({
            url: this.uploadApi,
            headers: {
                "accessToken": this.accessToken
            },
            formData: {
                "multipartFile": fs.createReadStream(localPath)
            }
        }, (error: any, response: any, body: any) => {
            if (!error && response.statusCode === 200) {
                let data = eval('(' + body + ')');
                if (data.code < 1) {
                    window.showWarningMessage(data.msg);
                    return;
                }
                let editor: any = window.activeTextEditor;
                editor.edit((editBuilder: { insert: (arg0: any, arg1: any) => void; }) => {
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
    requestApi(api: string, data: any, cb: any) {
        request.post({
            url: api,
            json: true,
            headers: {
                "accessToken": this.accessToken
            },
            form: data
        }, function (error: any, response: { statusCode: number; }, body: any) {
            if (!error && response.statusCode === 200) {
                if (body.code < 1) {
                    window.showWarningMessage(body.msg);
                    return;
                }
                cb(body);
            } else {
                window.showWarningMessage("请求失败");
            }
        });
    }

}
export {Xblog};
const IMG = "![%s](%s \"%s\")";
/**
 * 生成markdown Image
 */
function genImage(title: string, url: string) {
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
function genMetaHeader(submitToken: string, title: string, channel: string, labels: string) {
    return util.format(METADATA_HEADER, submitToken, title, channel, labels);
}

/**
 * 服务器对应的返回类
 */
class R {
    code: any;
    msg: any;
    data: any;
    constructor(code?: number, msg?: string, data?: any) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }
}

//截屏
function start() {
    // 获取当前编辑文件
    let editor = window.activeTextEditor;
    if (!editor) { return; }

    let fileUri = editor.document.uri;
    if (!fileUri) { return; }

    if (fileUri.scheme === 'untitled') {
        window.showInformationMessage('Before paste image, you need to save current edit file first.');
        return;
    }

    let selection = editor.selection;
    let selectText = editor.document.getText(selection);

    if (selectText && !/^[\w\-.]+$/.test(selectText)) {
        window.showInformationMessage('Your selection is not a valid file name!');
        return;
    }
    let config = workspace.getConfiguration('xblog');
    let localPath = config['localPath'];
    if (localPath && (localPath.length !== localPath.trim().length)) {
        window.showErrorMessage('The specified path is invalid. "' + localPath + '"');
        return;
    }

    let filePath = fileUri.fsPath;
    let imagePath = getImagePath(filePath, selectText, localPath);
    const mdFilePath = editor.document.fileName;
    const mdFileName = path.basename(mdFilePath, path.extname(mdFilePath));

    createImageDirWithImagePath(imagePath).then(imagePath => {
        saveClipboardImageToFileAndGetPath(imagePath, (imagePath: string) => {
            if (!imagePath) { return; }
            if (imagePath === 'no image') {
                window.showInformationMessage('没有要复制的图片,请重新截屏!');
                return;
            }
            imagePath = imagePath.substring(0, imagePath.lastIndexOf(".")) + ".png";
            new Xblog().uploadImg(imagePath);
        });
    }).catch(err => {
        window.showErrorMessage('创建文件夹失败!.');
        return;
    });
}

function getImagePath(filePath: string, selectText: string, localPath: any) {
    // 图片名称
    let imageFileName = '';
    if (!selectText) {
        imageFileName = moment().format("Y-MM-DD-HH-mm-ss") + '.png';
    } else {
        imageFileName = selectText + '.png';
    }

    // 图片本地保存路径
    let folderPath = path.dirname(filePath);
    let imagePath = '';
    if (path.isAbsolute(localPath)) {
        imagePath = path.join(localPath, imageFileName);
    } else {
        imagePath = path.join(folderPath, localPath, imageFileName);
    }

    return imagePath;
}

function createImageDirWithImagePath(imagePath: string) {
    return new Promise((resolve, reject) => {
        let imageDir = path.dirname(imagePath);
        fs.exists(imageDir, (exists: any) => {
            if (exists) {
                resolve(imagePath);
                return;
            }
            fs.mkdir(imageDir, (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(imagePath);
            });
        });
    });
}

function saveClipboardImageToFileAndGetPath(imagePath: {}, cb: { (arg0: string): void; (arg0: string): void; (arg0: string): void; }) {
    if (!imagePath) { return; }
    let platform = process.platform;
    if (platform === 'win32') {
        // Windows
        const scriptPath = path.join(__dirname, '../../../lib/pc.ps1');
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
        powershell.on('exit', function (code: any, signal: any) {

        });
        powershell.stdout.on('data', function (data: string) {
            cb(data.toString().trim());
        });
    } else if (platform === 'darwin') {
        // Mac
        let scriptPath = path.join(__dirname, '../../../lib/mac.applescript');

        let ascript = spawn('osascript', [scriptPath, imagePath]);
        ascript.on('exit', function (code: any, signal: any) {

        });

        ascript.stdout.on('data', function (data: string) {
            cb(data.toString().trim());
        });
    } else {
        // Linux

        let scriptPath = path.join(__dirname, '../../../lib/linux.sh');

        let ascript = spawn('sh', [scriptPath, imagePath]);
        ascript.on('exit', function (code: any, signal: any) {

        });

        ascript.stdout.on('data', function (data: string) {
            let result = data.toString().trim();
            if (result === "no xclip") {
                window.showInformationMessage('You need to install xclip command first.');
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
function findByTitle(array: any, title: string) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].title === title) {
            return array[i];
        }
    }
    return null;
}